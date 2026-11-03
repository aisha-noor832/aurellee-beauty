
const jwt = require("jsonwebtoken");
const generateToken = require("../../src/utils/generateToken");

describe("JWT Utility", () => {
  test("generates a valid JWT for a user", () => {
    const token = generateToken({
      _id: "507f1f77bcf86cd799439011",
    });

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: "aurelle-beauty",
      algorithms: ["HS256"],
    });

    expect(decoded.sub).toBe("507f1f77bcf86cd799439011");
  });

  test("generates tokens with an expiration", () => {
    const token = generateToken({
      _id: "507f1f77bcf86cd799439011",
    });

    const decoded = jwt.decode(token);

    expect(decoded.exp).toBeDefined();
    expect(decoded.iat).toBeDefined();
    expect(decoded.exp).toBeGreaterThan(decoded.iat);
  });
});
