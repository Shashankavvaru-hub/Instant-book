import dotenv from "dotenv";
dotenv.config();
import express, { json } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

import eventRoutes from "./routes/event.routes.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import paymentRoutes from "./routes/payments.routes.js";
import ticketRoutes from "./routes/ticket.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();

// CORS
app.use(
  cors(
    process.env.ALLOWED_ORIGINS
      ? {
          origin: process.env.ALLOWED_ORIGINS.split(","),
          credentials: true,
        }
      : {
          origin: true,      // reflect request origin — required for credentials in dev
          credentials: true,
        }
  ),
);

// Razorpay webhook signature verification requires the raw request body.
// Razorpay sends `application/json` (sometimes with charset), so use a
// function-form `type` to capture the raw bytes for HMAC verification.
app.use("/api/payments/webhook", express.raw({ type: () => true }));

// Serve static files from backend root (for qr-verifier.html)
app.use(express.static(path.join(__dirname, "..")));

// Body & cookies
app.use(json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/payments", paymentRoutes);
// Routes
app.use("/api/events", eventRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/redis", (await import("./routes/redis.route.js")).default);

// Global error handler
app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  console.error("ERROR:", err);

  res.status(err.statusCode).json({
    success: false,
    status: err.status,
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

export default app;
