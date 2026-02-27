import { Router } from "express";
import { paymentWebhook, createPaymentController, refundPaymentController } from "../controllers/payment.controller.js";
import { protect, restrictTo } from "../middlewares/auth.js";

const router = Router();

router.post("/create", protect, createPaymentController);
router.post("/webhook", paymentWebhook);
router.delete("/:bookingId/refund", protect, restrictTo("ADMIN"), refundPaymentController);

export default router;

