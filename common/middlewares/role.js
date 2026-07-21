const ApiError = require("../utils/apiError");
const logger = require("../logger");

function role(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn("Forbidden: role not allowed", {
        userId: req.user.id,
        role: req.user.role,
        path: req.originalUrl,
      });
      return next(ApiError.forbidden("You do not have permission to perform this action"));
    }

    next();
  };
}

module.exports = role;