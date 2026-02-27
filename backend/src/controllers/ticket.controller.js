import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { catchAsync } from "../utils/catchAsync.js";

/**
 * POST /api/tickets/verify
 * Body: { bookingReference: "BOOK-<uuid>" }
 *       OR the raw QR payload: "INSTANT-BOOK:BOOK-<uuid>"
 *
 * Admin-only. Returns booking details if valid, or a descriptive error.
 */
export const verifyTicket = catchAsync(async (req, res, next) => {
  let { bookingReference } = req.body;

  if (!bookingReference) {
    return next(new AppError("bookingReference is required", 400));
  }

  // Accept the raw QR payload format: "INSTANT-BOOK:BOOK-<uuid>"
  if (bookingReference.startsWith("INSTANT-BOOK:")) {
    bookingReference = bookingReference.replace("INSTANT-BOOK:", "");
  }

  const booking = await prisma.booking.findUnique({
    where: { bookingReference },
    select: {
      id: true,
      bookingReference: true,
      status: true,
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

  return res.status(200).json({
    success: true,
    valid: true,
    booking: {
      bookingReference: booking.bookingReference,
      status: booking.status,
      holderName: `${booking.user.firstName} ${booking.user.lastName ?? ""}`.trim(),
      holderEmail: booking.user.email,
      eventTitle: booking.event.title,
      eventStart: booking.event.startTime,
      eventEnd: booking.event.endTime,
      seats,
      totalAmount: Number(booking.totalAmount),
    },
  });
});
