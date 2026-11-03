
const mongoose = require("mongoose");

const Product = require("../models/Product");
const asyncHandler = require("../utils/asyncHandler");

const categories = ["face", "eyes", "lips", "skincare", "tools"];

const finishes = [
  "matte",
  "dewy",
  "satin",
  "natural",
  "shimmer",
  "glossy",
  "other",
];

const sortOptions = {
  newest: { createdAt: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  name_asc: { name: 1 },
};

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET /api/v1/products
const getProducts = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);

  const limit = Math.min(
    50,
    Math.max(1, parseInt(req.query.limit, 10) || 12)
  );

  const sortName = req.query.sort || "newest";

  if (!sortOptions[sortName]) {
    return res.status(400).json({
      success: false,
      message: "Invalid sort option",
    });
  }

  const filter = { isActive: true };

  if (req.query.category) {
    if (!categories.includes(req.query.category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product category",
      });
    }

    filter.category = req.query.category;
  }

  if (req.query.finish) {
    if (!finishes.includes(req.query.finish)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product finish",
      });
    }

    filter.finish = req.query.finish;
  }

  if (req.query.brand) {
    filter.brand = {
      $regex: `^${escapeRegex(req.query.brand)}$`,
      $options: "i",
    };
  }

  if (req.query.search) {
    const search = escapeRegex(req.query.search.trim());

    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { brand: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  const minPrice = req.query.minPrice;
  const maxPrice = req.query.maxPrice;

  if (minPrice !== undefined || maxPrice !== undefined) {
    const priceFilter = {};

    if (minPrice !== undefined) {
      const value = Number(minPrice);

      if (!Number.isFinite(value) || value < 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid minimum price",
        });
      }

      priceFilter.$gte = value;
    }

    if (maxPrice !== undefined) {
      const value = Number(maxPrice);

      if (!Number.isFinite(value) || value < 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid maximum price",
        });
      }

      priceFilter.$lte = value;
    }

    if (
      priceFilter.$gte !== undefined &&
      priceFilter.$lte !== undefined &&
      priceFilter.$gte > priceFilter.$lte
    ) {
      return res.status(400).json({
        success: false,
        message: "Minimum price cannot exceed maximum price",
      });
    }

    filter.price = priceFilter;
  }

  if (req.query.inStock === "true") {
    filter.variants = {
      $elemMatch: { stock: { $gt: 0 } },
    };
  }

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(sortOptions[sortName])
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    Product.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: products,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// GET /api/v1/products/:id
const getProductById = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    const error = new Error("Invalid product ID");
    error.statusCode = 400;
    throw error;
  }

  const product = await Product.findOne({
    _id: req.params.id,
    isActive: true,
  });

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({
    success: true,
    data: { product },
  });
});

// POST /api/v1/products
const createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);

  res.status(201).json({
    success: true,
    message: "Product created successfully",
    data: { product },
  });
});

// PATCH /api/v1/products/:id
const updateProduct = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    const error = new Error("Invalid product ID");
    error.statusCode = 400;
    throw error;
  }

  const product = await Product.findById(req.params.id);

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  Object.assign(product, req.body);

  await product.save();

  res.status(200).json({
    success: true,
    message: "Product updated successfully",
    data: { product },
  });
});

// DELETE /api/v1/products/:id
const deleteProduct = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    const error = new Error("Invalid product ID");
    error.statusCode = 400;
    throw error;
  }

  const product = await Product.findById(req.params.id);

  if (!product || !product.isActive) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  // Soft deletion: preserve existing order references.
  product.isActive = false;

  await product.save();

  res.status(200).json({
    success: true,
    message: "Product removed from catalogue",
  });
});

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
