import { Router } from "express";
import { protect, restrictTo } from "../middlewares/auth.js";
import { verifyTicket, resetCheckIn } from "../controllers/ticket.controller.js";

const router = Router();

// Only ADMINs (venue staff) can verify or manage ticket check-ins
router.post("/verify", protect, restrictTo("ADMIN"), verifyTicket);
router.post("/reset-checkin", protect, restrictTo("ADMIN"), resetCheckIn);

export default router;
