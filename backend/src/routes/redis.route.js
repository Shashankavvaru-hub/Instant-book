import express from "express";
import { redis } from "../config/redis.js";

const router = express.Router();

router.post("/clear", async (req, res) => {
  try {
    if (!redis.status || redis.status !== "ready") {
      throw new Error("Redis client not connected.");
    }
    await redis.flushAll();
    res.status(200).json({ message: "Redis data cleared." });
  } catch (error) {
    console.error("Error clearing Redis data:", error);
    res
      .status(500)
      .json({ error: "Failed to clear Redis data.", details: error.message });
  }
});

export default router;
