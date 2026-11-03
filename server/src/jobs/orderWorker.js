
require("dotenv").config();

const mongoose = require("mongoose");
const { Worker } = require("bullmq");

const createRedisConnection = require("../config/redis");

const Order = require("../models/Order");
const OrderEvent = require("../models/OrderEvent");

const QUEUE_NAME = "aurelle-order-events";

const processOrderEvent = async (job) => {
  console.log(
    `[WORKER] Processing job: ${job.name} | ${job.id}`
  );

  if (job.name !== "order.created") {
    throw new Error(`Unsupported event: ${job.name}`);
  }

  const order = await Order.findById(job.data.orderId)
    .select("_id orderNumber user total createdAt")
    .lean();

  if (!order) {
    throw new Error(`Order not found: ${job.data.orderId}`);
  }

  // Idempotent event persistence.
  // Reprocessing the same job will not create duplicate records.
  await OrderEvent.updateOne(
    {
      eventId: String(job.id),
    },
    {
      $setOnInsert: {
        eventId: String(job.id),
        eventType: job.name,
        order: order._id,

        payload: {
          orderNumber: order.orderNumber,
          customerId: order.user.toString(),
          total: order.total,
          currency: "INR",
        },

        processedAt: new Date(),
      },
    },
    {
      upsert: true,
    }
  );

  console.log(
    `[WORKER] ORDER_CREATED processed successfully: ${order.orderNumber}`
  );

  return {
    success: true,
    orderNumber: order.orderNumber,
  };
};

const startWorker = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  console.log("[WORKER] MongoDB connected");

  const redisConnection = createRedisConnection();

  const worker = new Worker(
    QUEUE_NAME,
    processOrderEvent,
    {
      connection: redisConnection,

      concurrency: Number(
        process.env.ORDER_WORKER_CONCURRENCY || 5
      ),
    }
  );

  worker.on("completed", (job, result) => {
    console.log(
      `[WORKER] Job completed: ${job.id}`,
      result
    );
  });

  worker.on("failed", (job, error) => {
    console.error(
      `[WORKER] Job failed: ${job?.id}`,
      error.message
    );
  });

  worker.on("error", (error) => {
    console.error("[WORKER ERROR]", error.message);
  });

  console.log(
    `[WORKER] Listening on queue: ${QUEUE_NAME}`
  );

  let shuttingDown = false;

  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log("[WORKER] Shutting down...");

    try {
      await worker.close();
      await redisConnection.quit();
      await mongoose.disconnect();

      console.log("[WORKER] Shutdown complete");
      process.exitCode = 0;
    } catch (error) {
      console.error("[WORKER] Shutdown error:", error.message);
      process.exitCode = 1;
    }
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

startWorker().catch((error) => {
  console.error("[WORKER STARTUP ERROR]", error.message);
  process.exitCode = 1;
});
