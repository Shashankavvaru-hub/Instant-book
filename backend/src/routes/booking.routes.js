import { Router } from "express";
import {
  cancelBooking,
  getBookingDetails,
  holdSeats,
} from "../controllers/booking.controller.js";
import { validate } from "../middlewares/validate.js";
import { holdSeatsSchema } from "../validators/booking.schema.js";
import { protect } from "../middlewares/auth.js";
import { get } from "mongoose";

const router = Router();

router.post("/", protect, holdSeats);

router.get("/:bookingId", protect, getBookingDetails);

router.delete("/:bookingId", protect, cancelBooking);

export default router;
