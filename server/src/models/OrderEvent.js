
const mongoose = require("mongoose");

const orderEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
    },

    eventType: {
      type: String,
      required: true,
      enum: [
        "order.created",
      ],
    },

    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    processedAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model(
  "OrderEvent",
  orderEventSchema
);
