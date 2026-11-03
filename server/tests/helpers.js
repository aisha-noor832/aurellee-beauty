
const bcrypt = require("bcryptjs");

const User = require("../src/models/User");
const Product = require("../src/models/Product");

const generateToken = require("../src/utils/generateToken");

const createUser = async ({
  name = "Test User",
  email = "customer@aurelle.test",
  role = "customer",
} = {}) => {
  const password = "TestPassword123!";

  const hashedPassword = await bcrypt.hash(password, 4);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
  });

  const token = generateToken(user);

  return {
    user,
    email: user.email,
    password,
    token,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

const createProduct = async (overrides = {}) => {
  const defaults = {
    name: "Velvet Matte Lipstick",
    slug: "velvet-matte-lipstick",
    description:
      "A luxurious matte lipstick with rich pigmentation.",
    brand: "Aurelle Beauty",
    category: "lips",
    price: 949,
    compareAtPrice: 1099,

    images: [
      "https://placehold.co/600x800?text=Aurelle"
    ],

    variants: [
      {
        sku: "AUR-LIP-RUBY",
        label: "Ruby Red",
        shadeHex: "#A83245",
        stock: 20,
      },
      {
        sku: "AUR-LIP-NUDE",
        label: "Rose Nude",
        shadeHex: "#B96955",
        stock: 15,
      },
    ],

    skinTypes: ["normal", "dry"],
    finish: "matte",
    ingredients: ["Vitamin E"],
    tags: ["lipstick", "matte"],
    isFeatured: true,
    isActive: true,
  };

  return Product.create({
    ...defaults,
    ...overrides,
  });
};

module.exports = {
  createUser,
  createProduct,
};
