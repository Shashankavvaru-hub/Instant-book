import { Router } from "express";
import {
  cancelBooking,
  getBookingDetails,
  getMyBookings,
  holdSeats,
} from "../controllers/booking.controller.js";
import { validate } from "../middlewares/validate.js";
import { holdSeatsSchema } from "../validators/booking.schema.js";
import { protect } from "../middlewares/auth.js";

const router = Router();

router.post("/", protect, validate(holdSeatsSchema), holdSeats);

router.get("/my", protect, getMyBookings);

router.get("/:bookingId", protect, getBookingDetails);

router.delete("/:bookingId", protect, cancelBooking);

export default router;
