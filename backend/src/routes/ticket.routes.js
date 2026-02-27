import { Router } from "express";
import { protect, restrictTo } from "../middlewares/auth.js";
import { verifyTicket } from "../controllers/ticket.controller.js";

const router = Router();

// Only ADMINs (venue staff) can verify tickets
router.post("/verify", protect, restrictTo("ADMIN"), verifyTicket);

export default router;
