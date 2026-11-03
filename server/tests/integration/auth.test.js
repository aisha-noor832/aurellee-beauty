
const request = require("supertest");
const app = require("../../src/app");

const { createUser } = require("../helpers");

describe("Authentication API", () => {
  test("POST /register creates a customer", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "New Customer",
        email: "newcustomer@test.com",
        password: "StrongPass123!",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);

    expect(response.body.data.user).toMatchObject({
      name: "New Customer",
      email: "newcustomer@test.com",
      role: "customer",
    });

    expect(response.body.data.user.password).toBeUndefined();
    expect(response.body.data.token).toBeDefined();
  });

  test("rejects admin role injection", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Malicious User",
        email: "malicious@test.com",
        password: "StrongPass123!",
        role: "admin",
      });

    expect(response.status).toBe(400);
  });

  test("POST /login authenticates valid credentials", async () => {
    const { email, password } = await createUser();

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password });

    expect(response.status).toBe(200);
    expect(response.body.data.token).toBeDefined();
  });

  test("rejects invalid login credentials", async () => {
    const { email } = await createUser();

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email,
        password: "WrongPassword123!",
      });

    expect(response.status).toBe(401);
  });

  test("GET /me returns authenticated user profile", async () => {
    const customer = await createUser();

    const response = await request(app)
      .get("/api/v1/auth/me")
      .set(customer.headers);

    expect(response.status).toBe(200);

    expect(response.body.data.user.email).toBe(
      customer.user.email
    );
  });

  test("rejects requests without a JWT", async () => {
    const response = await request(app)
      .get("/api/v1/auth/me");

    expect(response.status).toBe(401);
  });
});
