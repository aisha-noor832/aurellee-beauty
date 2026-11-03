
require("dotenv").config();

const mongoose = require("mongoose");
const OrderEvent = require("../src/models/OrderEvent");

const checkEvents = async () => {
  const orderId = process.argv[2];

  if (!mongoose.isValidObjectId(orderId)) {
    throw new Error(
      "Provide a valid Order ID: npm run check:events -- <orderId>"
    );
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);

    const events = await OrderEvent.find({
      order: orderId,
    })
      .sort({ processedAt: -1 })
      .lean();

    if (events.length === 0) {
      console.log("No processed events found for this order.");
    } else {
      console.log(
        JSON.stringify(events, null, 2)
      );
    }
  } finally {
    await mongoose.disconnect();
  }
};

checkEvents().catch((error) => {
  console.error("Event verification failed:", error.message);
  process.exitCode = 1;
});
