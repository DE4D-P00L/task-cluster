import { response } from "express";
import Redis from "ioredis";
import { taskQueue } from "./server.js";

export default function rateLimiter({ secWindow, maxAllowed, pre }) {
  return async function (req, res, next) {
    const userId = req.body.user.id;
    const redis = new Redis(process.env.REDIS_URL);
    const requests = await redis.incr(`${pre}-${userId}`);

    let ttl;
    if (requests === 1) {
      await redis.expire(`${pre}-${userId}`, secWindow);
      ttl = 60;
    } else {
      ttl = await redis.ttl(`${pre}-${userId}`);
    }

    if (requests > maxAllowed) {
      taskQueue.add("task", { userId });
      return res
        .status(503)
        .json({ response: "error", callsInAMinute: requests, ttl });
    } else {
      req.requests = requests;
      req.ttl = ttl;
      next();
    }
  };
}
