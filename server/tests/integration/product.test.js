
const request = require("supertest");
const app = require("../../src/app");

const {
  createUser,
  createProduct,
} = require("../helpers");

describe("Product API", () => {
  let admin;
  let customer;
  let product;

  beforeEach(async () => {
    admin = await createUser({
      email: "admin@test.com",
      role: "admin",
    });

    customer = await createUser({
      email: "customer@test.com",
    });

    product = await createProduct();
  });

  test("public users can retrieve products", async () => {
    const response = await request(app)
      .get("/api/v1/products");

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(1);

    expect(response.body.data[0].name).toBe(
      "Velvet Matte Lipstick"
    );
  });

  test("supports category and search filtering", async () => {
    const response = await request(app)
      .get("/api/v1/products?category=lips&search=velvet");

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(1);
  });

  test("admin can create a product", async () => {
    const response = await request(app)
      .post("/api/v1/products")
      .set(admin.headers)
      .send({
        name: "Hydrating Face Primer",
        slug: "hydrating-face-primer",
        description: "A lightweight hydrating makeup primer.",
        brand: "Aurelle Beauty",
        category: "face",
        price: 799,
        variants: [
          {
            sku: "AUR-PRIMER-001",
            label: "Universal",
            stock: 25,
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.data.product.name).toBe(
      "Hydrating Face Primer"
    );
  });

  test("customers cannot create products", async () => {
    const response = await request(app)
      .post("/api/v1/products")
      .set(customer.headers)
      .send({
        name: "Unauthorized Product",
      });

    expect(response.status).toBe(403);
  });

  test("admin can update product details", async () => {
    const response = await request(app)
      .patch(`/api/v1/products/${product._id}`)
      .set(admin.headers)
      .send({ price: 999 });

    expect(response.status).toBe(200);
    expect(response.body.data.product.price).toBe(999);
  });

  test("admin can deactivate a product", async () => {
    const response = await request(app)
      .delete(`/api/v1/products/${product._id}`)
      .set(admin.headers);

    expect(response.status).toBe(200);

    const publicResponse = await request(app)
      .get(`/api/v1/products/${product._id}`);

    expect(publicResponse.status).toBe(404);
  });
});
