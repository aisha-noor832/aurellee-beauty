
const mongoose = require("mongoose");
const crypto = require("crypto");

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },

  productName: {
    type: String,
    required: true,
    trim: true,
  },

  image: {
    type: String,
    default: "",
  },

  variantSku: {
    type: String,
    required: true,
    uppercase: true,
  },

  variantLabel: {
    type: String,
    required: true,
  },

  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },

  quantity: {
    type: Number,
    required: true,
    min: 1,
  },

  lineTotal: {
    type: Number,
    default: 0,
    min: 0,
  },
});

const shippingAddressSchema = new mongoose.Schema(
  {
    recipientName: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    addressLine1: {
      type: String,
      required: true,
      trim: true,
    },

    addressLine2: {
      type: String,
      default: "",
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    state: {
      type: String,
      required: true,
      trim: true,
    },

    postalCode: {
      type: String,
      required: true,
      trim: true,
    },

    country: {
      type: String,
      default: "India",
      trim: true,
    },
  },
  {
    _id: false,
  }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
      default: () =>
        `AUR-${crypto.randomBytes(5).toString("hex").toUpperCase()}`,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: "An order must contain at least one item",
      },
    },

    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },

    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    shippingFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    total: {
      type: Number,
      default: 0,
      min: 0,
    },

    paymentMethod: {
      type: String,
      enum: ["cod", "online"],
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },

    orderStatus: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "pending",
    },

    paymentReference: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Automatically calculate order totals from item snapshots.
orderSchema.pre("validate", function () {
  if (!this.items || this.items.length === 0) return;

  this.items.forEach((item) => {
    item.lineTotal = item.unitPrice * item.quantity;
  });

  this.subtotal = this.items.reduce(
    (sum, item) => sum + item.lineTotal,
    0
  );

  this.total =
    this.subtotal + this.shippingFee - this.discount;
});

// Prevent discounts from exceeding the subtotal.
orderSchema.path("discount").validate(function (value) {
  return value <= this.subtotal;
}, "Discount cannot exceed the order subtotal");

module.exports = mongoose.model("Order", orderSchema);
