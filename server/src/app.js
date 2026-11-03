
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const errorHandler = require("./middleware/errorMiddleware");

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  })
);

// Request parsing
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// HTTP request logging
app.use(morgan("dev"));

// Health check
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Auréllé Beauty API is running!",
    timestamp: new Date().toISOString(),
  });
});

// Authentication routes
app.use("/api/v1/auth", authRoutes);

// Product routes
app.use("/api/v1/products", productRoutes);

// Cart routes
app.use("/api/v1/cart", cartRoutes);

// Order routes
app.use("/api/v1/orders", orderRoutes);

// Handle unknown routes
app.use((req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

// Centralized error handling (must be last)
app.use(errorHandler);

module.exports = app;
