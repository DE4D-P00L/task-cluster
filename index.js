import cluster from "cluster";
import "dotenv/config";
import { startServer } from "./server.js";
import os from 'os';
const cpuCount = os.cpus().length;

const ClusterCount = cpuCount < 2 ? 1 : 2;

if (cluster.isPrimary) {
  for (let i = 0; i < ClusterCount; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  startServer();
}
