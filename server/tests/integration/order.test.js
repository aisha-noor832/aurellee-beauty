
const request = require("supertest");
const app = require("../../src/app");

const Order = require("../../src/models/Order");
const Product = require("../../src/models/Product");

const { orderQueue } = require("../../src/jobs/orderQueue");

const {
  createUser,
  createProduct,
} = require("../helpers");

const shippingAddress = {
  recipientName: "Test Customer",
  phone: "9876543210",
  addressLine1: "Flat 101, Example Apartments",
  addressLine2: "Madhapur",
  city: "Hyderabad",
  state: "Telangana",
  postalCode: "500081",
  country: "India",
};

describe("Order API", () => {
  let customer;
  let otherCustomer;
  let admin;
  let product;

  beforeEach(async () => {
    customer = await createUser({
      email: "customer@test.com",
    });

    otherCustomer = await createUser({
      email: "other@test.com",
    });

    admin = await createUser({
      email: "admin@test.com",
      role: "admin",
    });

    product = await createProduct();
  });

  test("customer can checkout successfully", async () => {
    // Add product to cart.
    const added = await request(app)
      .post("/api/v1/cart/items")
      .set(customer.headers)
      .send({
        productId: product._id.toString(),
        variantSku: "AUR-LIP-RUBY",
        quantity: 2,
      });

    expect(added.status).toBe(200);

    // Checkout.
    const response = await request(app)
      .post("/api/v1/orders/checkout")
      .set(customer.headers)
      .send({
        shippingAddress,
        paymentMethod: "cod",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);

    const order = response.body.data.order;

    expect(order.subtotal).toBe(1898);
    expect(order.shippingFee).toBe(50);
    expect(order.total).toBe(1948);
    expect(order.items[0].quantity).toBe(2);
    expect(order.orderStatus).toBe("pending");

    expect(response.body.data.eventQueued).toBe(true);
    expect(response.body.data.cartCleared).toBe(true);

    // Verify inventory deduction.
    const updatedProduct = await Product.findById(product._id);

    const rubyVariant = updatedProduct.variants.find(
      (variant) => variant.sku === "AUR-LIP-RUBY"
    );

    expect(rubyVariant.stock).toBe(18);

    // Verify queued event exists.
    const job = await orderQueue.getJob(
      `order-created-${order._id}`
    );

    expect(job).toBeDefined();

    expect(job.data.orderNumber).toBe(order.orderNumber);

    // Clean up this test's queued job.
    const state = await job.getState();

    if (state !== "active") {
      await job.remove();
    }
  });

  test("rejects checkout with an empty cart", async () => {
    const response = await request(app)
      .post("/api/v1/orders/checkout")
      .set(customer.headers)
      .send({
        shippingAddress,
        paymentMethod: "cod",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Your cart is empty");
  });

  test("customer can retrieve their own order history", async () => {
    const order = await Order.create({
      user: customer.user._id,

      items: [{
        product: product._id,
        productName: product.name,
        image: product.images[0],
        variantSku: "AUR-LIP-RUBY",
        variantLabel: "Ruby Red",
        unitPrice: product.price,
        quantity: 1,
      }],

      shippingAddress,
      paymentMethod: "cod",
    });

    const response = await request(app)
      .get("/api/v1/orders/my-orders")
      .set(customer.headers);

    expect(response.status).toBe(200);
    expect(response.body.pagination.total).toBe(1);

    expect(response.body.data[0]._id).toBe(
      order._id.toString()
    );
  });

  test("customer cannot retrieve another user's order", async () => {
    const order = await Order.create({
      user: customer.user._id,

      items: [{
        product: product._id,
        productName: product.name,
        image: product.images[0],
        variantSku: "AUR-LIP-RUBY",
        variantLabel: "Ruby Red",
        unitPrice: product.price,
        quantity: 1,
      }],

      shippingAddress,
      paymentMethod: "cod",
    });

    const response = await request(app)
      .get(`/api/v1/orders/${order._id}`)
      .set(otherCustomer.headers);

    expect(response.status).toBe(404);
  });

  test("admin can view all orders", async () => {
    await Order.create({
      user: customer.user._id,

      items: [{
        product: product._id,
        productName: product.name,
        image: product.images[0],
        variantSku: "AUR-LIP-RUBY",
        variantLabel: "Ruby Red",
        unitPrice: product.price,
        quantity: 1,
      }],

      shippingAddress,
      paymentMethod: "cod",
    });

    const response = await request(app)
      .get("/api/v1/orders/admin/all")
      .set(admin.headers);

    expect(response.status).toBe(200);
    expect(response.body.pagination.total).toBe(1);
  });

  test("admin can perform valid order status transitions", async () => {
    const order = await Order.create({
      user: customer.user._id,

      items: [{
        product: product._id,
        productName: product.name,
        image: product.images[0],
        variantSku: "AUR-LIP-RUBY",
        variantLabel: "Ruby Red",
        unitPrice: product.price,
        quantity: 1,
      }],

      shippingAddress,
      paymentMethod: "cod",
    });

    const response = await request(app)
      .patch(`/api/v1/orders/admin/${order._id}/status`)
      .set(admin.headers)
      .send({
        orderStatus: "confirmed",
      });

    expect(response.status).toBe(200);
    expect(response.body.data.order.orderStatus).toBe(
      "confirmed"
    );
  });

  test("rejects invalid order status transitions", async () => {
    const order = await Order.create({
      user: customer.user._id,

      items: [{
        product: product._id,
        productName: product.name,
        image: product.images[0],
        variantSku: "AUR-LIP-RUBY",
        variantLabel: "Ruby Red",
        unitPrice: product.price,
        quantity: 1,
      }],

      shippingAddress,
      paymentMethod: "cod",
    });

    const response = await request(app)
      .patch(`/api/v1/orders/admin/${order._id}/status`)
      .set(admin.headers)
      .send({
        orderStatus: "delivered",
      });

    expect(response.status).toBe(409);
  });

  test("customers cannot access admin order endpoints", async () => {
    const response = await request(app)
      .get("/api/v1/orders/admin/all")
      .set(customer.headers);

    expect(response.status).toBe(403);
  });
});
