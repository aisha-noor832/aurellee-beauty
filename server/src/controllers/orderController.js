
const mongoose = require("mongoose");

const {
  enqueueOrderCreated,
} = require("../jobs/orderQueue");

const Order = require("../models/Order");
const asyncHandler = require("../utils/asyncHandler");
const { createOrderFromCart } = require("../services/orderService");

const VALID_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const STATUS_TRANSITIONS = {
  pending: ["confirmed"],
  confirmed: ["processing"],
  processing: ["shipped"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

const parsePagination = (query) => {
  const requestedPage = Number(query.page || 1);
  const requestedLimit = Number(query.limit || 10);

  if (
    !Number.isInteger(requestedPage) ||
    !Number.isInteger(requestedLimit) ||
    requestedPage < 1 ||
    requestedLimit < 1 ||
    requestedLimit > 50
  ) {
    const error = new Error("Invalid pagination parameters");
    error.statusCode = 400;
    throw error;
  }

  return {
    page: requestedPage,
    limit: requestedLimit,
  };
};

// POST /api/v1/orders/checkout

const checkout = asyncHandler(async (req, res) => {
  const { shippingAddress, paymentMethod } = req.body;

  const result = await createOrderFromCart({
    userId: req.user._id,
    shippingAddress,
    paymentMethod,
  });

  let eventQueued = false;

  try {
    await enqueueOrderCreated(result.order);
    eventQueued = true;
  } catch (error) {
    console.error(
      "[ORDER EVENT] Failed to enqueue order event:",
      error.message
    );
  }

  res.status(201).json({
    success: true,

    message: result.cartCleared
      ? "Order placed successfully"
      : "Order placed, but cart clearing failed. Check your order history before trying again.",

    data: {
      order: result.order,
      cartCleared: result.cartCleared,
      eventQueued,
    },
  });
});


// GET /api/v1/orders/my-orders
const getMyOrders = asyncHandler(async (req, res) => {
  const { page, limit } = parsePagination(req.query);

  const filter = {
    user: req.user._id,
  };

  if (req.query.status) {
    if (!VALID_STATUSES.includes(req.query.status)) {
      const error = new Error("Invalid order status");
      error.statusCode = 400;
      throw error;
    }

    filter.orderStatus = req.query.status;
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    Order.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: orders,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// GET /api/v1/orders/:id
const getOrderById = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    const error = new Error("Invalid order ID");
    error.statusCode = 400;
    throw error;
  }

  const filter = {
    _id: req.params.id,
  };

  // Customers can only access their own orders.
  if (req.user.role !== "admin") {
    filter.user = req.user._id;
  }

  const order = await Order.findOne(filter);

  if (!order) {
    const error = new Error("Order not found");
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({
    success: true,
    data: { order },
  });
});

// GET /api/v1/orders/admin/all
const getAllOrders = asyncHandler(async (req, res) => {
  const { page, limit } = parsePagination(req.query);

  const filter = {};

  if (req.query.status) {
    if (!VALID_STATUSES.includes(req.query.status)) {
      const error = new Error("Invalid order status");
      error.statusCode = 400;
      throw error;
    }

    filter.orderStatus = req.query.status;
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    Order.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: orders,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// PATCH /api/v1/orders/admin/:id/status
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { orderStatus } = req.body;

  if (!mongoose.isValidObjectId(id)) {
    const error = new Error("Invalid order ID");
    error.statusCode = 400;
    throw error;
  }

  const order = await Order.findById(id);

  if (!order) {
    const error = new Error("Order not found");
    error.statusCode = 404;
    throw error;
  }

  const allowedTransitions =
    STATUS_TRANSITIONS[order.orderStatus] || [];

  if (!allowedTransitions.includes(orderStatus)) {
    const error = new Error(
      `Cannot transition order from ${order.orderStatus} to ${orderStatus}`
    );

    error.statusCode = 409;
    throw error;
  }

  // Use a conditional update to guard against concurrent
  // administrators updating the same order.
  const updatedOrder = await Order.findOneAndUpdate(
    {
      _id: id,
      orderStatus: order.orderStatus,
    },
    {
      $set: {
        orderStatus,
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  );

  if (!updatedOrder) {
    const error = new Error(
      "Order status changed concurrently. Please refresh."
    );

    error.statusCode = 409;
    throw error;
  }

  res.status(200).json({
    success: true,
    message: "Order status updated successfully",
    data: {
      order: updatedOrder,
    },
  });
});

module.exports = {
  checkout,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
};
