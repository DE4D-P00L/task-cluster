import express, { response } from "express";
import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
import rateLimiter from "./rateLimiter.js";
import fs from "fs";

const logFileName = "my_app.log";
const app = express();
app.use(express.json());

const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const taskQueue = new Queue("task-queue", {
  connection: redis,
});

taskQueue.on("failed", ({ jobId, failedReason }) => {
  console.log(`${jobId} has failed with reason ${failedReason}`);
});

app.get(
  "/",
  rateLimiter({ secWindow: 1, maxAllowed: 1, pre: "one-s" }),
  rateLimiter({ secWindow: 60, maxAllowed: 2, pre: "sixty-s" }),
  (req, res) => {
    res.json({ response: "ok", callsInAMin: req.requests, ttl: req.ttl });
  }
);

function logToTextFile(message) {
  const logMessage = `${new Date().toISOString()} - ${message}\n`;

  fs.appendFile(logFileName, logMessage, (err) => {
    if (err) {
      console.error("Error writing to log file:", err);
    } else {
      console.log(logMessage);
    }
  });
}

const worker = new Worker(
  "task-queue",
  async (job) => {
    const res = `${job.data.userId}-task completed at-${Date.now()}`;
    logToTextFile(res);
  },
  { connection: redis, removeOnFail: { count: 0 } }
);

export const startServer = () => {
  app.listen(3000, () => {
    console.log("Server listening on port 3000, worker: " + process.pid);
  });
};
