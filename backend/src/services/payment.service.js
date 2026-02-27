import { prisma } from "../config/prisma.js";
import { razorpay } from "../config/razorpay.js";
import crypto from "crypto";
import { redis } from "../config/redis.js";
import { AppError } from "../utils/AppError.js";
import { generateAndStoreTicket } from "./ticket.service.js";
import { sendBookingConfirmationEmail } from "./email.service.js";

export const createPayment = async (bookingId) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  if (booking.status !== "PENDING") {
    throw new AppError("Invalid booking state", 400);
  }

  if (booking.expiresAt < new Date()) {
    throw new AppError("Booking expired", 400);
  }

  // 1️⃣ Create Razorpay order
  const order = await razorpay.orders.create({
    amount: Math.round(booking.totalAmount * 100), // paise
    currency: "INR",
    receipt: `booking_${booking.id}`,
    payment_capture: 1,
  });

  console.log("Razorpay order created:", order);

  // 2️⃣ Store payment record
  const payment = await prisma.payment.create({
    data: {
      bookingId,
      amount: booking.totalAmount,
      provider: "Razorpay",
      status: "CREATED",
      gatewayOrderId: order.id,
    },
  });

  // 3️⃣ Return required details to frontend
  return {
    paymentId: payment.id,
    gatewayOrderId: order.id,
    amount: order.amount,
    currency: order.currency,
    key: process.env.RAZORPAY_KEY_ID,
  };
};


export const verifySignature = (rawBody, signature) => {

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!signature || !secret) return false;

  const payload = Buffer.isBuffer(rawBody) || typeof rawBody === "string"
    ? rawBody
    : JSON.stringify(rawBody ?? {});

  const expectedSignature = crypto
  .createHmac("sha256", secret)
  .update(payload)
  .digest("hex");
  
  console.log(expectedSignature,"----" ,signature);
  return expectedSignature === signature;
};

export const finalizeBooking = async (gatewayOrderId, gatewayPaymentId) => {
  console.log("control is in the finalizeBooking function");
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({
      where: { gatewayOrderId },
    });

    if (!payment) throw new AppError("Payment not found", 404);

    const booking = await tx.booking.findUnique({
      where: { id: payment.bookingId },
      include: {
        bookingSeats: {
          select: {
            eventSeat: { select: { seat: { select: { row: true, number: true } } } },
            eventSeatId: true,
          },
        },
        user: { select: { email: true, firstName: true } },
        event: { select: { title: true, startTime: true } },
      },
    });

    if (!booking) throw new AppError("Booking not found", 404);

    // Guard against duplicate webhook deliveries
    if (booking.status !== "PENDING") return null;

    const seatIds = booking.bookingSeats.map((bs) => bs.eventSeatId);

    // Seats are already BOOKED from hold time — just confirm the booking
    await tx.booking.update({
      where: { id: booking.id },
      data: { status: "CONFIRMED" },
    });

    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "SUCCESS", gatewayPaymentId },
    });

    return {
      bookingId: booking.id,
      bookingReference: booking.bookingReference,
      totalAmount: booking.totalAmount,
      eventId: booking.eventId,
      eventTitle: booking.event.title,
      eventDate: booking.event.startTime,
      seatIds,
      seats: booking.bookingSeats.map(
        (bs) => `${bs.eventSeat.seat.row}${bs.eventSeat.seat.number}`
      ),
      userEmail: booking.user.email,
      userName: booking.user.firstName,
    };
  });

  if (!result) return;

  // Release Redis locks now that the booking is permanently confirmed
  if (result.seatIds.length > 0) {
    const lockKeys = result.seatIds.map((id) => `lock:${result.eventId}:${id}`);
    console.log("Releasing locks:", lockKeys);
    await redis.del(...lockKeys);
  }

  // Generate QR code ticket and upload to Cloudinary (outside transaction — safe to retry)
  let qrCodeUrl = null;
  try {
    qrCodeUrl = await generateAndStoreTicket(result.bookingId, result.bookingReference);
    console.log(`[ticket] QR generated for booking #${result.bookingId}:`, qrCodeUrl);
  } catch (err) {
    console.error(`[ticket] QR generation failed for booking #${result.bookingId}:`, err.message);
  }

  // Send confirmation email (failure must not break the flow)
  await sendBookingConfirmationEmail({
    toEmail: result.userEmail,
    userName: result.userName,
    bookingReference: result.bookingReference,
    eventTitle: result.eventTitle,
    eventDate: result.eventDate,
    seats: result.seats,
    totalAmount: result.totalAmount,
    qrCodeUrl,
  });

  return result;
};


export const handleFailedPayment = async (gatewayOrderId) => {
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({
      where: { gatewayOrderId },
    });

    if (!payment) return;

    // Find the booking and its seats before making any changes
    const booking = await tx.booking.findUnique({
      where: { id: payment.bookingId },
      include: { bookingSeats: { select: { eventSeatId: true } } },
    });

    if (!booking || booking.status !== "PENDING") return;

    const eventSeatIds = booking.bookingSeats.map((bs) => bs.eventSeatId);

    // 1. Mark payment as FAILED
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED" },
    });

    // 2. Delete BookingSeat rows so the unique constraint is freed
    await tx.bookingSeat.deleteMany({
      where: { bookingId: booking.id },
    });

    // 3. Reset EventSeat statuses so seats are bookable again
    if (eventSeatIds.length > 0) {
      await tx.eventSeat.updateMany({
        where: { id: { in: eventSeatIds } },
        data: { status: "AVAILABLE" },
      });
    }

    // 4. Mark booking as CANCELLED
    await tx.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED" },
    });
  });
};
