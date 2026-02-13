import { BookingStatus } from "@prisma/client";
import { redis } from "../config/redis.js";
import { AppError } from "../utils/AppError.js";
import { prisma } from "../config/prisma.js";
import { uuidv4 } from "zod";

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
      // Validate seats still AVAILABLE
      const seats = await tx.eventSeat.findMany({
        where: {
          id: { in: eventSeatIds },
          status: "AVAILABLE",
        },
      });

      if (seats.length !== eventSeatIds.length) {
        throw new AppError("Seats no longer available", 409);
      }
      const totalAmount = seats.length * 10; // Assuming each seat costs $10, replace with actual pricing logic
      // Create booking
      const newBooking = await tx.booking.create({
        data: {
          userId,
          eventId,
          bookingReference: `BOOK-${uuidv4()}`,
          status: "PENDING",
          totalAmount,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });

      // Link seats
      await tx.bookingSeat.createMany({
        data: eventSeatIds.map((seatId) => ({
          bookingId: newBooking.id,
          eventSeatId: seatId,
        })),
      });

      return newBooking;
    });
  } catch (err) {
    throw err;
  }
};

export const releaseSeatLocks = async (eventId, seats) => {
  const keys = seats.map(
    (seat) => `lock:${eventId}:${seat.row}:${seat.number}`,
  );

  if (keys.length) await redis.del(...keys);
};
