
const { z } = require("zod");

const addCartItemSchema = z.object({
  productId: z.string().regex(/^[a-fA-F0-9]{24}$/),

  variantSku: z.string().trim().min(2).max(50),

  quantity: z.number().int().min(1).max(20).default(1),
}).strict();

const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(20),
}).strict();

module.exports = {
  addCartItemSchema,
  updateCartItemSchema,
};
