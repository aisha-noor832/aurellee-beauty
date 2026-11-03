
const request = require("supertest");
const app = require("../../src/app");

const {
  createUser,
  createProduct,
} = require("../helpers");

describe("Shopping Cart API", () => {
  let customer;
  let product;

  beforeEach(async () => {
    customer = await createUser();

    product = await createProduct();
  });

  test("returns an empty cart for a new customer", async () => {
    const response = await request(app)
      .get("/api/v1/cart")
      .set(customer.headers);

    expect(response.status).toBe(200);
    expect(response.body.data.cart.items).toHaveLength(0);
  });

  test("customer can add a product to cart", async () => {
    const response = await request(app)
      .post("/api/v1/cart/items")
      .set(customer.headers)
      .send({
        productId: product._id.toString(),
        variantSku: "AUR-LIP-RUBY",
        quantity: 2,
      });

    expect(response.status).toBe(200);

    expect(response.body.data.cart.items).toHaveLength(1);

    expect(response.body.data.cart.subtotal).toBe(1898);
    expect(response.body.data.cart.totalItems).toBe(2);
  });

  test("customer can update cart quantity", async () => {
    const added = await request(app)
      .post("/api/v1/cart/items")
      .set(customer.headers)
      .send({
        productId: product._id.toString(),
        variantSku: "AUR-LIP-RUBY",
        quantity: 2,
      });

    const itemId = added.body.data.cart.items[0].itemId;

    const response = await request(app)
      .patch(`/api/v1/cart/items/${itemId}`)
      .set(customer.headers)
      .send({ quantity: 4 });

    expect(response.status).toBe(200);
    expect(response.body.data.cart.items[0].quantity).toBe(4);
    expect(response.body.data.cart.subtotal).toBe(3796);
  });

  test("customer can remove a cart item", async () => {
    const added = await request(app)
      .post("/api/v1/cart/items")
      .set(customer.headers)
      .send({
        productId: product._id.toString(),
        variantSku: "AUR-LIP-RUBY",
        quantity: 1,
      });

    const itemId = added.body.data.cart.items[0].itemId;

    const response = await request(app)
      .delete(`/api/v1/cart/items/${itemId}`)
      .set(customer.headers);

    expect(response.status).toBe(200);
    expect(response.body.data.cart.items).toHaveLength(0);
  });

  test("rejects quantities exceeding available stock", async () => {
    await product.updateOne({
      $set: {
        "variants.0.stock": 2,
      },
    });

    const response = await request(app)
      .post("/api/v1/cart/items")
      .set(customer.headers)
      .send({
        productId: product._id.toString(),
        variantSku: "AUR-LIP-RUBY",
        quantity: 3,
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/available/i);
  });

  test("cart endpoints require authentication", async () => {
    const response = await request(app)
      .get("/api/v1/cart");

    expect(response.status).toBe(401);
  });
});
