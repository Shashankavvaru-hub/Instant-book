import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { catchAsync } from "../utils/catchAsync.js";

/**
 * POST /api/tickets/verify
 * Body: { bookingReference: "BOOK-<uuid>", checkIn?: boolean }
 *       OR the raw QR payload: "INSTANT-BOOK:BOOK-<uuid>"
 *
 * Admin-only. Returns booking details and handles check-in.
 * By default (checkIn !== false), marks the ticket as checked in atomically.
 * If already checked in, flags as duplicate and denies second entry.
 */
export const verifyTicket = catchAsync(async (req, res, next) => {
  let { bookingReference, checkIn = true } = req.body;

  if (!bookingReference) {
    return next(new AppError("bookingReference is required", 400));
  }

  // Accept the raw QR payload format: "INSTANT-BOOK:BOOK-<uuid>"
  if (bookingReference.startsWith("INSTANT-BOOK:")) {
    bookingReference = bookingReference.replace("INSTANT-BOOK:", "");
  }
  bookingReference = bookingReference.trim();

  const booking = await prisma.booking.findUnique({
    where: { bookingReference },
    select: {
      id: true,
      bookingReference: true,
      status: true,
      checkedIn: true,
      checkedInAt: true,
      totalAmount: true,
      createdAt: true,
      user: {
        select: { firstName: true, lastName: true, email: true },
      },
      event: {
        select: { title: true, startTime: true, endTime: true },
      },
      bookingSeats: {
        select: {
          eventSeat: {
            select: { seat: { select: { row: true, number: true } } },
          },
        },
      },
    },
  });

  if (!booking) {
    return res.status(404).json({
      success: false,
      valid: false,
      reason: "Booking not found",
    });
  }

  if (booking.status !== "CONFIRMED") {
    return res.status(200).json({
      success: true,
      valid: false,
      reason: `Booking is ${booking.status.toLowerCase()}`,
      booking: {
        bookingReference: booking.bookingReference,
        status: booking.status,
      },
    });
  }

  const seats = booking.bookingSeats.map(
    (bs) => `${bs.eventSeat.seat.row}${bs.eventSeat.seat.number}`
  );

  const bookingDetails = {
    bookingReference: booking.bookingReference,
    status: booking.status,
    holderName: `${booking.user.firstName} ${booking.user.lastName ?? ""}`.trim(),
    holderEmail: booking.user.email,
    eventTitle: booking.event.title,
    eventStart: booking.event.startTime,
    eventEnd: booking.event.endTime,
    seats,
    totalAmount: Number(booking.totalAmount),
  };

  // Duplicate Check-In Prevention
  if (booking.checkedIn) {
    const checkedInAtFormatted = booking.checkedInAt
      ? new Date(booking.checkedInAt).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "previously";

    return res.status(200).json({
      success: true,
      valid: false,
      alreadyCheckedIn: true,
      reason: `Duplicate check-in detected! This ticket was already checked in at ${checkedInAtFormatted}.`,
      booking: {
        ...bookingDetails,
        checkedIn: true,
        checkedInAt: booking.checkedInAt,
      },
    });
  }

  // If inspection-only mode requested without recording check-in
  if (checkIn === false) {
    return res.status(200).json({
      success: true,
      valid: true,
      alreadyCheckedIn: false,
      booking: {
        ...bookingDetails,
        checkedIn: false,
        checkedInAt: null,
      },
    });
  }

  // Atomic check-in: prevent race conditions if same QR is scanned concurrently
  const checkInTime = new Date();
  const updateResult = await prisma.booking.updateMany({
    where: {
      id: booking.id,
      checkedIn: false,
      status: "CONFIRMED",
    },
    data: {
      checkedIn: true,
      checkedInAt: checkInTime,
    },
  });

  if (updateResult.count === 0) {
    // Concurrent scan occurred
    const freshBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
      select: { checkedInAt: true },
    });
    const formatted = freshBooking?.checkedInAt
      ? new Date(freshBooking.checkedInAt).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "just now";

    return res.status(200).json({
      success: true,
      valid: false,
      alreadyCheckedIn: true,
      reason: `Duplicate check-in detected! This ticket was already checked in at ${formatted}.`,
      booking: {
        ...bookingDetails,
        checkedIn: true,
        checkedInAt: freshBooking?.checkedInAt || checkInTime,
      },
    });
  }

  return res.status(200).json({
    success: true,
    valid: true,
    alreadyCheckedIn: false,
    message: "Ticket valid — Check-in recorded successfully.",
    booking: {
      ...bookingDetails,
      checkedIn: true,
      checkedInAt: checkInTime,
    },
  });
});

/**
 * POST /api/tickets/reset-checkin
 * Body: { bookingReference: "BOOK-<uuid>" }
 *
 * Admin-only. Resets check-in status in case of an accidental scan or admin override.
 */
export const resetCheckIn = catchAsync(async (req, res, next) => {
  let { bookingReference } = req.body;

  if (!bookingReference) {
    return next(new AppError("bookingReference is required", 400));
  }

  if (bookingReference.startsWith("INSTANT-BOOK:")) {
    bookingReference = bookingReference.replace("INSTANT-BOOK:", "");
  }
  bookingReference = bookingReference.trim();

  const booking = await prisma.booking.findUnique({
    where: { bookingReference },
    select: { id: true, bookingReference: true, status: true, checkedIn: true },
  });

  if (!booking) {
    return next(new AppError("Booking not found", 404));
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      checkedIn: false,
      checkedInAt: null,
    },
  });

  return res.status(200).json({
    success: true,
    message: `Check-in status successfully reset for ${booking.bookingReference}.`,
  });
});
