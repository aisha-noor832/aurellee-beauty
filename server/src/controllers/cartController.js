
const mongoose = require("mongoose");

const Cart = require("../models/Cart");
const Product = require("../models/Product");
const asyncHandler = require("../utils/asyncHandler");

// Get or create a customer's cart.
const getOrCreateCart = async (userId) => {
  return Cart.findOneAndUpdate(
    { user: userId },
    {
      $setOnInsert: {
        user: userId,
        items: [],
      },
    },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );
};

// Populate product information and format the response.
const buildCartResponse = async (cart) => {
  await cart.populate({
    path: "items.product",
    select: "name slug brand category price images variants isActive",
  });

  const items = cart.items.map((item) => {
    const product = item.product;

    const variant = product
      ? product.variants.find(
          (v) => v.sku === item.variantSku
        )
      : null;

    const unitPrice = product?.price ?? null;

    return {
      itemId: item._id,
      product: product
        ? {
            id: product._id,
            name: product.name,
            slug: product.slug,
            brand: product.brand,
            category: product.category,
            image: product.images[0] || "",
          }
        : null,

      variantSku: item.variantSku,
      variantLabel: variant?.label || "Unavailable",

      quantity: item.quantity,
      unitPrice,

      lineTotal:
        unitPrice === null ? null : unitPrice * item.quantity,

      available: Boolean(
        product &&
        product.isActive &&
        variant &&
        variant.stock >= item.quantity
      ),

      availableStock: variant?.stock ?? 0,
    };
  });

  const subtotal = items.reduce(
    (sum, item) => sum + (item.lineTotal ?? 0),
    0
  );

  return {
    cartId: cart._id,
    items,
    subtotal,
    currency: "INR",
    totalItems: items.reduce(
      (sum, item) => sum + item.quantity,
      0
    ),
  };
};

// GET /api/v1/cart
const getCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);

  res.status(200).json({
    success: true,
    data: {
      cart: await buildCartResponse(cart),
    },
  });
});

// POST /api/v1/cart/items
const addCartItem = asyncHandler(async (req, res) => {
  const { productId, variantSku, quantity } = req.body;

  const product = await Product.findOne({
    _id: productId,
    isActive: true,
  });

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  const sku = variantSku.toUpperCase();

  const variant = product.variants.find(
    (v) => v.sku === sku
  );

  if (!variant) {
    const error = new Error("Selected product variant not found");
    error.statusCode = 404;
    throw error;
  }

  const cart = await getOrCreateCart(req.user._id);

  const existingItem = cart.items.find(
    (item) =>
      item.product.toString() === product._id.toString() &&
      item.variantSku === sku
  );

  const newQuantity = existingItem
    ? existingItem.quantity + quantity
    : quantity;

  if (newQuantity > 20) {
    const error = new Error("Maximum quantity per item is 20");
    error.statusCode = 400;
    throw error;
  }

  if (newQuantity > variant.stock) {
    const error = new Error(
      `Only ${variant.stock} units are currently available`
    );

    error.statusCode = 400;
    throw error;
  }

  if (existingItem) {
    existingItem.quantity = newQuantity;
  } else {
    cart.items.push({
      product: product._id,
      variantSku: sku,
      quantity,
    });
  }

  await cart.save();

  res.status(200).json({
    success: true,
    message: "Item added to cart successfully",
    data: {
      cart: await buildCartResponse(cart),
    },
  });
});

// PATCH /api/v1/cart/items/:itemId
const updateCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const { quantity } = req.body;

  if (!mongoose.isValidObjectId(itemId)) {
    const error = new Error("Invalid cart item ID");
    error.statusCode = 400;
    throw error;
  }

  const cart = await Cart.findOne({
    user: req.user._id,
  });

  const item = cart?.items.id(itemId);

  if (!item) {
    const error = new Error("Cart item not found");
    error.statusCode = 404;
    throw error;
  }

  const product = await Product.findOne({
    _id: item.product,
    isActive: true,
  });

  if (!product) {
    const error = new Error("Product is no longer available");
    error.statusCode = 400;
    throw error;
  }

  const variant = product.variants.find(
    (v) => v.sku === item.variantSku
  );

  if (!variant || quantity > variant.stock) {
    const error = new Error(
      "Requested quantity is currently unavailable"
    );

    error.statusCode = 400;
    throw error;
  }

  item.quantity = quantity;

  await cart.save();

  res.status(200).json({
    success: true,
    message: "Cart quantity updated successfully",
    data: {
      cart: await buildCartResponse(cart),
    },
  });
});

// DELETE /api/v1/cart/items/:itemId
const removeCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  if (!mongoose.isValidObjectId(itemId)) {
    const error = new Error("Invalid cart item ID");
    error.statusCode = 400;
    throw error;
  }

  const cart = await Cart.findOne({
    user: req.user._id,
  });

  const item = cart?.items.id(itemId);

  if (!item) {
    const error = new Error("Cart item not found");
    error.statusCode = 404;
    throw error;
  }

  cart.items.pull({ _id: itemId });

  await cart.save();

  res.status(200).json({
    success: true,
    message: "Item removed from cart",
    data: {
      cart: await buildCartResponse(cart),
    },
  });
});

// DELETE /api/v1/cart
const clearCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);

  cart.items = [];

  await cart.save();

  res.status(200).json({
    success: true,
    message: "Cart cleared successfully",
    data: {
      cart: await buildCartResponse(cart),
    },
  });
});

module.exports = {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
};
