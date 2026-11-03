const os = require("os");
const path = require("path");
const mongoose = require("mongoose");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
  quiet: true,
});

// Test environment configuration
process.env.NODE_ENV = "test";

// Never use the development JWT secret in automated tests.
process.env.JWT_SECRET =
  "aurelle-test-only-secret-do-not-use-in-production";

process.env.JWT_EXPIRES_IN = "1d";

// Always use a separate test database.
process.env.MONGO_URI =
  process.env.TEST_MONGO_URI ||
  "mongodb://127.0.0.1:27017/aurelle_beauty_test";

process.env.REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
process.env.REDIS_PORT = process.env.REDIS_PORT || "6379";

process.env.SHIPPING_FEE = process.env.SHIPPING_FEE || "50";

// Identify the current test file.
const testPath = expect.getState().testPath || "";

const isIntegrationTest = /[\\/]integration[\\/]/.test(testPath);

// Only integration tests need MongoDB.
if (isIntegrationTest) {
    beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
        runtimeAdapters: { os },
    });

        console.log(
        `[TEST] Connected to database: ${mongoose.connection.name}`
        );
    });

  afterEach(async () => {
    const collections = Object.values(
      mongoose.connection.collections
    );

    await Promise.all(
      collections.map((collection) =>
        collection.deleteMany({})
      )
    );
  });


afterAll(async () => {
  // Close BullMQ queue connections created by app.js.
  const queuePath = require.resolve(
    "../src/jobs/orderQueue"
  );

  if (require.cache[queuePath]) {
    const {
      orderQueue,
      redisConnection,
    } = require(queuePath);

    await orderQueue.close();

    // Explicitly close the externally supplied Redis connection.
    if (
      redisConnection &&
      redisConnection.status !== "end"
    ) {
      redisConnection.disconnect();
    }

    console.log("[TEST] BullMQ and Redis connections closed");
  }

  // Disconnect the test MongoDB database.
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  console.log("[TEST] MongoDB connection closed");
});

}
