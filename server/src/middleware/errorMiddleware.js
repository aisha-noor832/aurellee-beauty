
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  console.error(err);

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";

  // Handle MongoDB duplicate key errors
  if (err.code === 11000) {
    statusCode = 409;

    const field = Object.keys(err.keyValue || {})[0];
    message = `${field || "Field"} already exists`;
  }

  // Handle Mongoose validation errors
  if (err.name === "ValidationError") {
    statusCode = 400;

    message = Object.values(err.errors)
      .map((error) => error.message)
      .join(", ");
  }

  // Handle invalid MongoDB ObjectIds
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource identifier";
  }

  res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500 && process.env.NODE_ENV === "production"
        ? "Internal server error"
        : message,
  });
};

module.exports = errorHandler;
