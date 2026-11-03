
const express = require("express");

const {
  checkout,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
} = require("../controllers/orderController");

const { checkoutSchema } = require("../validators/orderValidator");

const {
  updateOrderStatusSchema,
} = require("../validators/orderStatusValidator");

const validate = require("../middleware/validate");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

// All order endpoints require authentication.
router.use(protect);

// Customer checkout
router.post(
  "/checkout",
  validate(checkoutSchema),
  checkout
);

// Customer order history
router.get("/my-orders", getMyOrders);

// Admin order management
router.get(
  "/admin/all",
  authorize("admin"),
  getAllOrders
);

router.patch(
  "/admin/:id/status",
  authorize("admin"),
  validate(updateOrderStatusSchema),
  updateOrderStatus
);

// Individual order retrieval
// Keep this after the named routes.
router.get("/:id", getOrderById);

module.exports = router;
