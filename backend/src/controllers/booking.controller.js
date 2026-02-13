import { AppError } from "../utils/AppError.js";
import { catchAsync } from "../utils/catchAsync.js";
import { lockSeats } from "../services/booking.service.js";

export const holdSeats = catchAsync(async (req, res, next) => {
  const { eventId, seats } = req.body;
  const userId = req.user.id;

  const aquired = await lockSeats(eventId, seats, userId);
  if (!aquired) {
    return next(
      new AppError(
        "Some of the seats are already booked, please try again",
        409,
      ),
    );
  }
  res.status(200).json({
    message:
      "Seats held successfully, please confirm booking within 10 minutes",
  });
});

