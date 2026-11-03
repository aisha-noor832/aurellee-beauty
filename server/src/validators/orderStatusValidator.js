
const { z } = require("zod");

const updateOrderStatusSchema = z.object({
  orderStatus: z.enum([
    "confirmed",
    "processing",
    "shipped",
    "delivered",
  ]),
}).strict();

module.exports = {
  updateOrderStatusSchema,
};
