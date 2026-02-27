import { prisma } from "../config/prisma.js";
import { razorpay } from "../config/razorpay.js";
import { AppError } from "../utils/AppError.js";

/**
 * Processes a full refund for a CONFIRMED booking.
 * - Calls Razorpay refund API
 * - Marks Payment as REFUNDED, Booking as CANCELLED
 * - Frees the seats (deletes BookingSeat rows, resets EventSeat → AVAILABLE)
 *
 * @param {number} bookingId
 */
export const processRefund = async (bookingId) => {
  // 1. Fetch booking with payment and seats
  const booking = await prisma.booking.findUnique({
    where: { id: Number(bookingId) },
    include: {
      payment: true,
      bookingSeats: { select: { eventSeatId: true } },
    },
  });

  if (!booking) throw new AppError("Booking not found", 404);

  if (booking.status !== "CONFIRMED") {
    throw new AppError(
      `Cannot refund a booking with status '${booking.status}'. Only CONFIRMED bookings can be refunded.`,
      400
    );
  }

  const payment = booking.payment;

  if (!payment || payment.status !== "SUCCESS") {
    throw new AppError("No successful payment found for this booking", 400);
  }

  if (!payment.gatewayPaymentId) {
    throw new AppError("Gateway payment ID missing — cannot process refund", 400);
  }

  // 2. Call Razorpay refund API (full amount in paise)
  const amountInPaise = Math.round(Number(payment.amount) * 100);
  try {
    await razorpay.payments.refund(payment.gatewayPaymentId, {
      amount: amountInPaise,
    });
    console.log(
      `[refund] Razorpay refund initiated for payment ${payment.gatewayPaymentId} — ₹${payment.amount}`
    );
  } catch (err) {
    console.error("[refund] Razorpay refund API error:", err);
    throw new AppError(`Razorpay refund failed: ${err.error?.description ?? err.message}`, 502);
  }

  const eventSeatIds = booking.bookingSeats.map((bs) => bs.eventSeatId);

  // 3. Update DB atomically
  await prisma.$transaction(async (tx) => {
    // Mark payment as REFUNDED
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "REFUNDED" },
    });

    // Delete BookingSeat rows so the constraint is freed
    await tx.bookingSeat.deleteMany({
      where: { bookingId: Number(bookingId) },
    });

    // Reset seats to AVAILABLE
    if (eventSeatIds.length > 0) {
      await tx.eventSeat.updateMany({
        where: { id: { in: eventSeatIds } },
        data: { status: "AVAILABLE" },
      });
    }

    // Cancel the booking
    await tx.booking.update({
      where: { id: Number(bookingId) },
      data: { status: "CANCELLED" },
    });
  });

  console.log(`[refund] Booking #${bookingId} fully refunded and seats released.`);
};
