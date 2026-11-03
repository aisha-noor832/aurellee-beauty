
const express = require("express");

const {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
} = require("../controllers/cartController");

const {
  addCartItemSchema,
  updateCartItemSchema,
} = require("../validators/cartValidator");

const validate = require("../middleware/validate");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// All cart endpoints require authentication.
router.use(protect);

router.get("/", getCart);

router.post(
  "/items",
  validate(addCartItemSchema),
  addCartItem
);

router.patch(
  "/items/:itemId",
  validate(updateCartItemSchema),
  updateCartItem
);

router.delete("/items/:itemId", removeCartItem);

router.delete("/", clearCart);

module.exports = router;
