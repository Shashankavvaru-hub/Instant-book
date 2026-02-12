import { z } from "zod";

export const holdSeatsSchema = z.object({
  body: z.object({
    eventId: z.number(),
    seats: z.array(
      z.object({
        row: z.string(),
        number: z.number(),
      })
    ).min(1),
  }),
});

export const confirmBookingSchema = z.object({
  body: z.object({
    eventId: z.string().min(1, "Event ID is required"),
    seats: z.array(z.string()).min(1, "At least one seat is required"),
    paymentId: z.string().min(1, "Payment ID is required"),
  }),
});
