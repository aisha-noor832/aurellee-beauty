
const {
  registerSchema,
  loginSchema,
} = require("../../src/validators/authValidator");

describe("Authentication Validators", () => {
  test("accepts valid registration data", () => {
    const result = registerSchema.safeParse({
      name: "Test Customer",
      email: "customer@test.com",
      password: "StrongPass123!",
    });

    expect(result.success).toBe(true);
  });

  test("rejects invalid email", () => {
    const result = registerSchema.safeParse({
      name: "Test Customer",
      email: "invalid-email",
      password: "StrongPass123!",
    });

    expect(result.success).toBe(false);
  });

  test("rejects short passwords", () => {
    const result = registerSchema.safeParse({
      name: "Test Customer",
      email: "customer@test.com",
      password: "123",
    });

    expect(result.success).toBe(false);
  });

  test("does not allow role injection during registration", () => {
    const result = registerSchema.safeParse({
      name: "Test Customer",
      email: "customer@test.com",
      password: "StrongPass123!",
      role: "admin",
    });

    expect(result.success).toBe(false);
  });

  test("accepts valid login data", () => {
    const result = loginSchema.safeParse({
      email: "customer@test.com",
      password: "StrongPass123!",
    });

    expect(result.success).toBe(true);
  });
});
