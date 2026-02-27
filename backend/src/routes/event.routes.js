import { Router } from "express";
import {
  getEvents,
  getEventById,
  createEvent,
} from "../controllers/event.controller.js";
import { protect, restrictTo } from "../middlewares/auth.js";
import { uploadEventImage } from "../config/uploadEventImage.js";
import { getEventSeats } from "../controllers/event.controller.js";

const router = Router();

router.get("/", getEvents);
router.get("/:id", getEventById);
router.post(
  "/create",
  protect,
  restrictTo("ADMIN"),
  uploadEventImage.single("image"),
  createEvent,
);
router.get("/:id/seats",protect, getEventSeats);

export default router;
