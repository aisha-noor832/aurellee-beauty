
const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
  },

  label: {
    type: String,
    required: true,
    trim: true,
  },

  shadeHex: {
    type: String,
    default: null,
    match: [/^#([A-Fa-f0-9]{6})$/, "Invalid shade color"],
  },

  stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
});

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: 150,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    description: {
      type: String,
      required: [true, "Product description is required"],
      trim: true,
    },

    brand: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      enum: ["face", "eyes", "lips", "skincare", "tools"],
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    compareAtPrice: {
      type: Number,
      default: null,
      min: 0,
      validate: {
        validator: function (value) {
          return value == null || value > this.price;
        },
        message: "Compare-at price must exceed the selling price",
      },
    },

    images: {
      type: [String],
      default: [],
    },

    variants: {
      type: [variantSchema],
      validate: {
        validator: (variants) => variants.length > 0,
        message: "At least one product variant is required",
      },
    },

    skinTypes: [{
      type: String,
      enum: ["oily", "dry", "combination", "normal", "sensitive"],
    }],

    finish: {
      type: String,
      enum: [
        "matte",
        "dewy",
        "satin",
        "natural",
        "shimmer",
        "glossy",
        "other",
      ],
      default: "other",
    },

    ingredients: [{
      type: String,
      trim: true,
    }],

    tags: [{
      type: String,
      trim: true,
      lowercase: true,
    }],

    isFeatured: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Prevent duplicate SKUs within the same product.
productSchema.pre("validate", function () {
  const skus = this.variants.map((variant) => variant.sku);

  if (new Set(skus).size !== skus.length) {
    this.invalidate(
      "variants",
      "Variant SKUs must be unique within a product"
    );
  }
});

// Indexes for catalogue queries.
productSchema.index({ category: 1, isActive: 1, createdAt: -1 });
productSchema.index({ brand: 1, isActive: 1 });
productSchema.index({
  name: "text",
  brand: "text",
  description: "text",
  tags: "text",
});

module.exports = mongoose.model("Product", productSchema);
