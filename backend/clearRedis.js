import { redis } from "./src/config/redis.js";

const clearRedis = async () => {
  const keys = await redis.keys("*");
  if (keys.length) {
    await redis.del(...keys);
  }
};

clearRedis();
