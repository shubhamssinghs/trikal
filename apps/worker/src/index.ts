import { Worker, Queue } from "bullmq";
import Redis from "ioredis";

const connection = new Redis({
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
  maxRetriesPerRequest: null,
});

// Transcript analysis worker
const transcriptWorker = new Worker(
  "transcript-analysis",
  async (job) => {
    console.log(`Processing transcript job ${job.id}`, job.data);
    // TODO: implement transcript analysis with @trikal/ai
  },
  { connection }
);

transcriptWorker.on("completed", (job) => {
  console.log(`Transcript job ${job.id} completed`);
});

transcriptWorker.on("failed", (job, err) => {
  console.error(`Transcript job ${job?.id} failed:`, err);
});

console.log("Worker started — listening for jobs");
