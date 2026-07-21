const crypto = require("crypto");
const logger = require("../logger");

function requestLogger(req, res, next) {
  const requestId = crypto.randomUUID();
  req.requestId = requestId;

  const startTime = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - startTime;

    logger.info("Incoming request", {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      userId: req.user ? req.user.id : undefined,
      durationMs,
    });
  });

  next();
}

module.exports = requestLogger;