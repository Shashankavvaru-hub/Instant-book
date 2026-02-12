import dotenv from "dotenv";
dotenv.config();
import express, { json } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import eventRoutes from "./routes/event.routes.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";

const app = express();

// CORS
app.use(
  cors(
    process.env.ALLOWED_ORIGINS
      ? {
          origin: process.env.ALLOWED_ORIGINS.split(","),
          credentials: true,
        }
      : undefined
  )
);

// Body & cookies
app.use(json());
app.use(cookieParser());

// Routes
app.use("/events", eventRoutes);
app.use("/auth", authRoutes);
app.use("/user", userRoutes);

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
