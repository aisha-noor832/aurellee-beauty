
const { z } = require("zod");

const shippingAddressSchema = z.object({
  recipientName: z.string().trim().min(2).max(80),

  phone: z.string()
    .trim()
    .regex(/^\+?[0-9][0-9\s-]{8,14}$/, "Invalid phone number"),

  addressLine1: z.string().trim().min(5).max(200),

  addressLine2: z.string().trim().max(200).optional().default(""),

  city: z.string().trim().min(2).max(80),

  state: z.string().trim().min(2).max(80),

  postalCode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit PIN code"),

  country: z.string().trim().default("India"),
}).strict();

const checkoutSchema = z.object({
  shippingAddress: shippingAddressSchema,

  paymentMethod: z.enum(["cod", "online"]).default("cod"),
}).strict();

module.exports = {
  checkoutSchema,
};
