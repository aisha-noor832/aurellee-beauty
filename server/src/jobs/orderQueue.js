
const { Queue } = require("bullmq");

const createRedisConnection = require("../config/redis");

// Keep an explicit reference to the Redis connection
// so it can be cleaned up during Jest shutdown.
const redisConnection = createRedisConnection();

const orderQueue = new Queue("aurelle-order-events", {
  connection: redisConnection,

  defaultJobOptions: {
    attempts: 5,

    backoff: {
      type: "exponential",
      delay: 1000,
    },

    removeOnComplete: 1000,

    removeOnFail: false,
  },
});

orderQueue.on("error", (error) => {
  console.error("[ORDER QUEUE ERROR]", error.message);
});

const enqueueOrderCreated = async (order) => {
  return orderQueue.add(
    "order.created",
    {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
    },
    {
      jobId: `order-created-${order._id}`,
    }
  );
};

module.exports = {
  orderQueue,
  enqueueOrderCreated,
  redisConnection,
};
