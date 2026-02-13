import { redis } from "../config/redis.js";
import { AppError } from "../utils/AppError.js";

// lockSeats.js
export const lockSeats = async (eventId, seats, userId) => {
  const pipeline = redis.multi();
  console.log("Attempting to acquire locks for seats:", seats);

  for (const seat of seats) {
    const key = `lock:${eventId}:${seat.row}:${seat.number}`;

    pipeline.set(key, userId, {
      nx: true,
      ex: 120, // seconds
    });
  }

  if (pipeline.length === 0) {
    throw new AppError("No seats to lock", 400);
  }

  const results = await pipeline.exec();

  for (const res of results) {
    if (res === null) {
      throw new Error("One or more seats already locked");
    }
  }

  return true;
};

export const releaseSeatLocks = async (eventId, seats) => {
  const keys = seats.map(
    (seat) => `lock:${eventId}:${seat.row}:${seat.number}`,
  );

  if (keys.length) await redis.del(...keys);
};

