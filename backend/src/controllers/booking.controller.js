import { AppError } from "../utils/AppError.js";
import { catchAsync } from "../utils/catchAsync.js";
import {
  createBooking,
  getBookingDetailsService,
  cancelBookingService,
  getMyBookingsService,
} from "../services/booking.service.js";

export const holdSeats = catchAsync(async (req, res, next) => {
  const { eventId, eventSeatIds } = req.body;
  const userId = req.user.id;

  const booking = await createBooking(eventId, eventSeatIds, userId);
  console.log(booking);
  if (!booking) {
    return next(
      new AppError(
        "Unable to hold seats, they may have just been booked by someone else. Please try again.",
        409,
      ),
    );
  }
  res.status(200).json({
    message:
      "Seats held successfully! Please proceed to payment within 2 minutes to confirm your booking.",
  });
});

export const getBookingDetails = catchAsync(async (req, res, next) => {
  const { bookingId } = req.params;

  const booking = await getBookingDetailsService(bookingId);

  res.status(200).json({
    success: true,
    booking,
  });
});

export const cancelBooking = catchAsync(async (req, res, next) => {
  const { bookingId } = req.params;
  const userId = req.user.id;

  const result = await cancelBookingService(bookingId, userId);

  const message = result.refunded
    ? `Booking ${bookingId} has been cancelled and a refund has been initiated (Refund ID: ${result.razorpayRefundId}). It may take 5–7 business days to reflect.`
    : `Booking ${bookingId} has been cancelled and seats are now available again.`;

  res.status(200).json({
    success: true,
    message,
    refunded: result.refunded,
    ...(result.refunded && { razorpayRefundId: result.razorpayRefundId }),
  });
});

export const getMyBookings = catchAsync(async (req, res) => {
  const bookings = await getMyBookingsService(req.user.id);
  res.status(200).json({ success: true, bookings });
});


