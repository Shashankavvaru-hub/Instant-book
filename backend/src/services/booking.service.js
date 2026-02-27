import { BookingStatus } from "@prisma/client";
import { redis } from "../config/redis.js";
import { AppError } from "../utils/AppError.js";
import { prisma } from "../config/prisma.js";
import { uuidv4 } from "zod";
import { randomUUID } from "crypto";
import { razorpay } from "../config/razorpay.js";

// lockSeats.js
export const lockSeats = async (eventId, eventSeatIds, userId) => {
  const pipeline = redis.multi();
  console.log("Attempting to acquire locks for seats:", eventSeatIds);

  for (const eventSeatId of eventSeatIds) {
    const key = `lock:${eventId}:${eventSeatId}`;

    pipeline.set(key, userId, {
      nx: true,
      ex: 120,
    });
  }

  if (pipeline.length === 0) {
    throw new AppError("No seats to lock", 400);
  }

  const results = await pipeline.exec();

  for (const res of results) {
    if (res === null) {
      throw new Error("One or more seats already locked");
    }
  }
};

export const createBooking = async (eventId, eventSeatIds, userId) => {
  try {
    await lockSeats(eventId, eventSeatIds, userId);
    // ---------------------------
    // 2️⃣ DB Transaction
    // ---------------------------

    const booking = await prisma.$transaction(async (tx) => {
      // -------------------------------------------------------------------
      // Cleanup: remove stale BookingSeat rows from expired/cancelled
      // bookings so the unique constraint on eventSeatId is never violated.
      // Also reset the corresponding EventSeat statuses back to AVAILABLE.
      // -------------------------------------------------------------------
      const staleBookingSeats = await tx.bookingSeat.findMany({
        where: {
          eventSeatId: { in: eventSeatIds },
          booking: { status: { in: ["EXPIRED", "CANCELLED"] } },
        },
        select: { eventSeatId: true },
      });

      if (staleBookingSeats.length > 0) {
        const staleEventSeatIds = staleBookingSeats.map((bs) => bs.eventSeatId);

        await tx.bookingSeat.deleteMany({
          where: { eventSeatId: { in: staleEventSeatIds } },
        });

        await tx.eventSeat.updateMany({
          where: { id: { in: staleEventSeatIds } },
          data: { status: "AVAILABLE" },
        });
      }

      // Validate seats are AVAILABLE
      const seats = await tx.eventSeat.findMany({
        where: {
          id: { in: eventSeatIds },
          status: "AVAILABLE",
        },
      });
      console.log(seats);
      if (seats.length !== eventSeatIds.length) {
        throw new AppError("Seats no longer available", 409);
      }

      const SEAT_PRICE = 100; // ₹100 per seat
      const totalAmount = seats.length * SEAT_PRICE;

      // Create booking
      const newBooking = await tx.booking.create({
        data: {
          userId,
          eventId,
          bookingReference: `BOOK-${randomUUID()}`,
          status: "PENDING",
          totalAmount,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });

      // Link seats to booking
      await tx.bookingSeat.createMany({
        data: eventSeatIds.map((seatId) => ({
          bookingId: newBooking.id,
          eventSeatId: seatId,
        })),
      });

      // Mark seats as BOOKED so they are unavailable to others
      await tx.eventSeat.updateMany({
        where: { id: { in: eventSeatIds } },
        data: { status: "BOOKED" },
      });

      console.log(newBooking);
      return newBooking;
    });
    return booking;
  } catch (err) {
    throw err;
  }
};

export const cancelBookingService = async (bookingId, userId) => {
  if (!bookingId) {
    throw new AppError("Booking ID is required", 400);
  }

  const booking = await prisma.booking.findUnique({
    where: { id: Number(bookingId) },
    include: {
      bookingSeats: true,
      payment: true,
    },
  });

  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  // Ownership check
  if (booking.userId !== userId) {
    throw new AppError("You are not authorised to cancel this booking", 403);
  }

  if (booking.status === "CANCELLED") {
    throw new AppError("Booking is already cancelled", 400);
  }

  if (booking.status === "EXPIRED") {
    throw new AppError("Expired bookings cannot be cancelled", 400);
  }

  const eventSeatIds = booking.bookingSeats.map((bs) => bs.eventSeatId);

  // ── CONFIRMED booking → issue Razorpay refund first ──────────────────────
  if (booking.status === "CONFIRMED") {
    const payment = booking.payment;

    if (!payment || !payment.gatewayPaymentId) {
      throw new AppError(
        "Cannot refund: payment details not found for this booking",
        400
      );
    }

    // Razorpay refund API — amount is in paise (multiply ₹ by 100)
    const refund = await razorpay.payments.refund(payment.gatewayPaymentId, {
      amount: Math.round(Number(booking.totalAmount) * 100),
      speed: "normal", // "normal" (T+5 days) or "optimum" (instant if eligible)
      notes: {
        reason: "Customer requested cancellation",
        bookingId: String(booking.id),
      },
    });

    console.log(
      `[cancelBooking] Razorpay refund initiated for booking #${booking.id}:`,
      refund.id
    );

    // Persist refund outcome + cancel booking + free seats in one transaction
    await prisma.$transaction(async (tx) => {
      // Mark payment as REFUNDED and store the refund id
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "REFUNDED",
          receiptUrl: refund.id, // re-use receiptUrl to store Razorpay refund id
        },
      });

      // Remove BookingSeat rows
      await tx.bookingSeat.deleteMany({
        where: { bookingId: Number(bookingId) },
      });

      // Free up the seats
      if (eventSeatIds.length > 0) {
        await tx.eventSeat.updateMany({
          where: { id: { in: eventSeatIds } },
          data: { status: "AVAILABLE" },
        });
      }

      // Mark booking as CANCELLED
      await tx.booking.update({
        where: { id: Number(bookingId) },
        data: { status: "CANCELLED" },
      });
    });

    return { refunded: true, razorpayRefundId: refund.id };
  }

  // ── PENDING booking → just cancel, no refund needed ──────────────────────
  await prisma.$transaction(async (tx) => {
    await tx.bookingSeat.deleteMany({
      where: { bookingId: Number(bookingId) },
    });

    if (eventSeatIds.length > 0) {
      await tx.eventSeat.updateMany({
        where: { id: { in: eventSeatIds } },
        data: { status: "AVAILABLE" },
      });
    }

    await tx.booking.update({
      where: { id: Number(bookingId) },
      data: { status: "CANCELLED" },
    });
  });

  return { refunded: false };
};

export const releaseSeatLocks = async (eventId, seats) => {
  const keys = seats.map(
    (seat) => `lock:${eventId}:${seat.row}:${seat.number}`,
  );

  if (keys.length) await redis.del(...keys);
};

export const getMyBookingsService = async (userId) => {
  return await prisma.booking.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      bookingReference: true,
      status: true,
      totalAmount: true,
      expiresAt: true,
      createdAt: true,
      event: {
        select: { id: true, title: true, startTime: true, imageUrl: true },
      },
      bookingSeats: {
        select: {
          eventSeat: {
            select: { seat: { select: { row: true, number: true } } },
          },
        },
      },
      payment: {
        select: { status: true, amount: true },
      },
    },
  });
};


export const getBookingDetailsService = async (bookingId) => {
  if (!bookingId) {
    throw new AppError("Booking ID is required", 400);
  }

  return await prisma.booking.findUnique({
    where: { id: Number(bookingId) },
    select: {
      id: true,
      totalAmount: true,
      status: true,
      expiresAt: true,

      event: {
        select: {
          id: true,
          title: true,
        },
      },

      bookingSeats: {
        select: {
          eventSeat: {
            select: {
              seat: true,
            },
          },
        },
      },
    },
  });
};
