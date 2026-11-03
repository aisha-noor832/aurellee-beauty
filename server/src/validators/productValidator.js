
const { z } = require("zod");

const variantSchema = z.object({
  sku: z.string().trim().min(2).max(50),
  label: z.string().trim().min(1).max(80),

  shadeHex: z.string()
    .regex(/^#([A-Fa-f0-9]{6})$/)
    .nullable()
    .optional(),

  stock: z.number().int().min(0),
}).strict();

const createProductSchema = z.object({
  name: z.string().trim().min(2).max(150),

  slug: z.string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),

  description: z.string().trim().min(10),

  brand: z.string().trim().min(1).max(100),

  category: z.enum([
    "face",
    "eyes",
    "lips",
    "skincare",
    "tools",
  ]),

  price: z.number().min(0),

  compareAtPrice: z.number().min(0).nullable().optional(),

  images: z.array(z.string().trim().min(1)).optional(),

  variants: z.array(variantSchema).min(1),

  skinTypes: z.array(z.enum([
    "oily",
    "dry",
    "combination",
    "normal",
    "sensitive",
  ])).optional(),

  finish: z.enum([
    "matte",
    "dewy",
    "satin",
    "natural",
    "shimmer",
    "glossy",
    "other",
  ]).optional(),

  ingredients: z.array(z.string().trim()).optional(),

  tags: z.array(z.string().trim()).optional(),

  isFeatured: z.boolean().optional(),
}).strict();

const updateProductSchema = createProductSchema
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: "At least one field must be provided" }
  );

module.exports = {
  createProductSchema,
  updateProductSchema,
};
