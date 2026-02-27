import cron from "node-cron";
import { prisma } from "../config/prisma.js";

/**
 * Runs every minute.
 * Finds all PENDING bookings whose expiresAt has passed,
 * frees their seats (deletes BookingSeat rows + resets EventSeat status),
 * and marks each booking as EXPIRED.
 */
export const startExpireBookingsJob = () => {
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();

      // Find all expired-but-still-PENDING bookings with their seats
      const expiredBookings = await prisma.booking.findMany({
        where: {
          status: "PENDING",
          expiresAt: { lt: now },
        },
        include: {
          bookingSeats: {
            select: { eventSeatId: true },
          },
        },
      });

      if (expiredBookings.length === 0) return;

      console.log(
        `[expireBookingsJob] Expiring ${expiredBookings.length} booking(s)...`,
      );

      for (const booking of expiredBookings) {
        const eventSeatIds = booking.bookingSeats.map((bs) => bs.eventSeatId);

        await prisma.$transaction(async (tx) => {
          // 1. Remove the BookingSeat rows so the unique constraint is freed
          await tx.bookingSeat.deleteMany({
            where: { bookingId: booking.id },
          });

          // 2. Reset the EventSeat statuses back to AVAILABLE
          if (eventSeatIds.length > 0) {
            await tx.eventSeat.updateMany({
              where: { id: { in: eventSeatIds } },
              data: { status: "AVAILABLE" },
            });
          }

          // 3. Mark the booking as EXPIRED
          await tx.booking.update({
            where: { id: booking.id },
            data: { status: "EXPIRED" },
          });
        });

        console.log(
          `[expireBookingsJob] Booking #${booking.id} expired. Freed seats: [${eventSeatIds.join(", ")}]`,
        );
      }
    } catch (err) {
      console.error("[expireBookingsJob] Error during expiry sweep:", err);
    }
  });

  console.log("✅ Booking expiry job scheduled (runs every minute)");
};
