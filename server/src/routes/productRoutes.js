
const express = require("express");

const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const {
  createProductSchema,
  updateProductSchema,
} = require("../validators/productValidator");

const validate = require("../middleware/validate");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// Public routes
router.get("/", getProducts);
router.get("/:id", getProductById);

// Admin-only routes
router.post(
  "/",
  protect,
  authorize("admin"),
  validate(createProductSchema),
  createProduct
);

router.patch(
  "/:id",
  protect,
  authorize("admin"),
  validate(updateProductSchema),
  updateProduct
);

router.delete(
  "/:id",
  protect,
  authorize("admin"),
  deleteProduct
);

module.exports = router;
