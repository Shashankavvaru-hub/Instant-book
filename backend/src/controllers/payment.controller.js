import {
  verifySignature,
  finalizeBooking,
  handleFailedPayment,
  createPayment
} from "../services/payment.service.js";
import { processRefund } from "../services/refund.service.js";
import { catchAsync } from "../utils/catchAsync.js";
import { AppError } from "../utils/AppError.js";
import { prisma } from "../config/prisma.js";

export const createPaymentController = catchAsync(async (req, res, next) => {
  const { bookingId } = req.body;
  const userId = req.user.id;

  if (!bookingId) {
    return next(new AppError("Booking ID is required", 400));
  }

  // Ensure booking belongs to logged-in user
  const booking = await prisma.booking.findUnique({
    where: { id: Number(bookingId) },
  });

  if (!booking) {
    return next(new AppError("Booking not found", 404));
  }

  if (booking.userId !== userId) {
    return next(new AppError("Unauthorized", 403));
  }

  const paymentData = await createPayment(booking.id);

  res.status(200).json({
    success: true,
    data: paymentData,
  });
});


export const paymentWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];

    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
      console.error("❌ RAZORPAY_WEBHOOK_SECRET is not set in environment variables!");
    }

    if (!signature) {
      console.warn("⚠️  No x-razorpay-signature header — request did not come from Razorpay (check Dashboard webhook config)");
      return res.status(400).json({ received: false });
    }

    // express.raw() should have given us a Buffer. Log the type to confirm.
    console.log("webhook body type:", typeof req.body, "| isBuffer:", Buffer.isBuffer(req.body));

    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(JSON.stringify(req.body ?? {})); // fallback (should not happen)

    if (!verifySignature(rawBody, signature)) {
      console.log("❌ Signature mismatch - received:", signature);
      return res.status(200).json({ received: true });
    }

    const body = Buffer.isBuffer(req.body)
      ? JSON.parse(req.body.toString("utf8"))
      : (req.body ?? {});
    const event = body.event;

    const entity = body.payload.payment.entity;
    const gatewayOrderId = entity.order_id;
    const gatewayPaymentId = entity.id;

    if (event === "payment.captured") {
      await finalizeBooking(gatewayOrderId, gatewayPaymentId);
    }

    if (event === "payment.failed") {
      await handleFailedPayment(gatewayOrderId);
    }

  } catch (err) {
    console.error("Webhook error:", err);
  }

  res.status(200).json({ received: true });
};

export const refundPaymentController = catchAsync(async (req, res, next) => {
  const { bookingId } = req.params;

  await processRefund(bookingId);

  res.status(200).json({
    success: true,
    message: `Booking #${bookingId} has been refunded and seats released.`,
  });
});

