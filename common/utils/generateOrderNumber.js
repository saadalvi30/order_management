const crypto = require("crypto");

/**
 * Generates a human-readable, unique order number.
 * Example: ORD-20260717-A1B2C3
 */
function generateOrderNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `ORD-${datePart}-${randomPart}`;
}

module.exports = generateOrderNumber;