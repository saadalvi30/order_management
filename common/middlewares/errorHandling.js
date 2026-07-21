const ApiError = require("../utils/apiError");
const logger = require("../logger");

function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";


  if (!(err instanceof ApiError)) {
    logger.error("Unhandled error", {
      requestId: req.requestId,
      userId: req.user ? req.user.id : undefined,
      path: req.originalUrl,
      error: err.message,
      stack: err.stack,
    });
    statusCode = 500;
    message = "Something went wrong. Please try again later.";
  } else {
    logger.warn("Handled API error", {
      requestId: req.requestId,
      userId: req.user ? req.user.id : undefined,
      path: req.originalUrl,
      statusCode,
      message,
    });
  }

  const errorNames = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    409: "Conflict",
    500: "Internal Server Error",
  };

  res.status(statusCode).json({
    statusCode,
    error: errorNames[statusCode] || "Error",
    message,
    path: req.originalUrl,
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    statusCode: 404,
    error: "Not Found",
    message: `Route ${req.originalUrl} not found`,
    path: req.originalUrl,
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
  });
}

module.exports = { errorHandler, notFoundHandler };