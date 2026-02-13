import { AppError } from "../utils/AppError.js";
import { catchAsync } from "../utils/catchAsync.js";
import { createBooking } from "../services/booking.service.js";

export const holdSeats = catchAsync(async (req, res, next) => {
  const { eventId, eventSeatIds } = req.body;
  const userId = req.user.id;

  const booking = await createBooking(eventId, eventSeatIds, userId);
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
  // Logic to retrieve booking details by bookingId
  res.status(200).json({
    success: true,
    message: `Booking details for ID: ${bookingId}`,
  });
});

export const cancelBooking = catchAsync(async (req, res, next) => {
  const { bookingId } = req.params;
  // Logic to cancel booking by bookingId
  res.status(200).json({
    success: true,
    message: `Booking with ID: ${bookingId} has been cancelled`,
  });
});
