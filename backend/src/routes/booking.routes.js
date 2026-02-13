import { Router } from "express";
import { holdSeats } from "../controllers/booking.controller.js";
import { validate } from "../middlewares/validate.js";
import { holdSeatsSchema } from "../validators/booking.schema.js";
import { protect } from "../middlewares/auth.js";

const router = Router();

router.post("/hold", protect, validate(holdSeatsSchema), holdSeats);
export default router;
