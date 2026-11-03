
const { z } = require("zod");

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),

  email: z.string().trim().toLowerCase().email(),

  password: z.string().min(8).max(72),
}).strict();

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),

  password: z.string().min(1),
}).strict();

module.exports = {
  registerSchema,
  loginSchema,
};
