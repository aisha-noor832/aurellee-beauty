
module.exports = {
  testEnvironment: "node",

  testMatch: [
    "<rootDir>/tests/**/*.test.js",
  ],

  setupFilesAfterEnv: [
    "<rootDir>/tests/setup.js",
  ],

  clearMocks: true,

  testTimeout: 15000,
};
