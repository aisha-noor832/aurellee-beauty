
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Order = require("../models/Order");

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// Restore inventory if order creation fails.
const rollbackStock = async (reservedItems) => {
  for (const item of [...reservedItems].reverse()) {
    try {
      await Product.updateOne(
        { _id: item.product },
        {
          $inc: {
            "variants.$[variant].stock": item.quantity,
          },
        },
        {
          arrayFilters: [
            { "variant.sku": item.variantSku },
          ],
        }
      );
    } catch (error) {
      console.error(
        `Stock rollback failed for ${item.variantSku}:`,
        error.message
      );
    }
  }
};

const createOrderFromCart = async ({
  userId,
  shippingAddress,
  paymentMethod,
}) => {
  // Retrieve the customer's cart and its products.
  const cart = await Cart.findOne({
    user: userId,
  }).populate("items.product");

  if (!cart || cart.items.length === 0) {
    throw createHttpError("Your cart is empty", 400);
  }

  // Validate all items and prepare price snapshots.
  const lines = new Map();

  for (const item of cart.items) {
    const product = item.product;

    if (!product || !product.isActive) {
      throw createHttpError(
        "A product in your cart is no longer available",
        409
      );
    }

    const sku = item.variantSku;

    const variant = product.variants.find(
      (v) => v.sku === sku
    );

    if (!variant) {
      throw createHttpError(
        `Variant ${sku} is no longer available`,
        409
      );
    }

    const key = `${product._id}:${sku}`;

    const existing = lines.get(key);

    if (existing) {
      existing.quantity += item.quantity;
    } else {
      lines.set(key, {
        product: product._id,
        productName: product.name,
        image: product.images[0] || "",
        variantSku: sku,
        variantLabel: variant.label,
        unitPrice: product.price,
        quantity: item.quantity,
      });
    }
  }

  const orderItems = Array.from(lines.values());

  // Validate combined quantities against current inventory.
  for (const item of orderItems) {
    const product = await Product.findById(item.product);

    const variant = product?.variants.find(
      (v) => v.sku === item.variantSku
    );

    if (
      !product ||
      !product.isActive ||
      product.price !== item.unitPrice ||
      !variant ||
      variant.stock < item.quantity
    ) {
      throw createHttpError(
        `Insufficient stock or product changes for ${item.productName}. Please refresh your cart.`,
        409
      );
    }
  }

  const subtotal = orderItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  const shippingFee = Number(process.env.SHIPPING_FEE ?? 50);

  if (!Number.isFinite(shippingFee) || shippingFee < 0) {
    throw new Error("Invalid SHIPPING_FEE configuration");
  }

  const discount = 0;

  // Reserve inventory using atomic conditional updates.
  const reservedItems = [];
  let order;

  try {
    for (const item of orderItems) {
      const result = await Product.updateOne(
        {
          _id: item.product,
          isActive: true,
          price: item.unitPrice,

          variants: {
            $elemMatch: {
              sku: item.variantSku,
              stock: { $gte: item.quantity },
            },
          },
        },
        {
          $inc: {
            "variants.$.stock": -item.quantity,
          },
        }
      );

      if (result.modifiedCount !== 1) {
        throw createHttpError(
          `Stock or price changed for ${item.productName}. Please refresh your cart.`,
          409
        );
      }

      reservedItems.push(item);
    }

    // Create the order using server-generated snapshots.
    order = await Order.create({
      user: userId,
      items: orderItems,
      shippingAddress,
      subtotal,
      shippingFee,
      discount,
      paymentMethod,
      paymentStatus: "pending",
      orderStatus: "pending",
    });

  } catch (error) {
    // Compensating rollback if an order was not created.
    await rollbackStock(reservedItems);

    throw error;
  }

  // Clear the cart only after successful order creation.
  let cartCleared = false;

  try {
    const result = await Cart.updateOne(
      { user: userId },
      { $set: { items: [] } }
    );

    cartCleared = result.modifiedCount === 1;
  } catch (error) {
    console.error(
      "Order created, but cart clearing failed:",
      error.message
    );
  }

  return {
    order,
    cartCleared,
  };
};

module.exports = {
  createOrderFromCart,
};
