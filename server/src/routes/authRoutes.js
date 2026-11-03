
const express = require("express");
const { rateLimit } = require("express-rate-limit");

const {
  register,
  login,
  getMe,
} = require("../controllers/authController");

const {
  registerSchema,
  loginSchema,
} = require("../validators/authValidator");

const validate = require("../middleware/validate");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Limit authentication requests
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

// Public routes
router.post("/register", authLimiter, validate(registerSchema), register);

router.post("/login", authLimiter, validate(loginSchema), login);

// Protected routes
router.get("/me", protect, getMe);

module.exports = router;
