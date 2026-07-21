const db = require("../../common/db");
const ApiError = require("../../common/utils/apiError");
const ROLES = require("../../common/constants/role");

/**
 * Records one row in order_activities. Accepts an optional `client` so it
 * can participate in the same transaction as the order action that
 * triggered it (create, cancel, status change, expiry).
 */
async function recordActivity(
  { orderId, action, previousValue, newValue, userId, requestId },
  client = db
) {
  await client.query(
    `INSERT INTO order_activities (orderid, action, previousvalue, newvalue, userid, requestid)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      orderId,
      action,
      previousValue != null ? String(previousValue) : null,
      newValue != null ? String(newValue) : null,
      userId || null,
      requestId || null,
    ]
  );
}

// Customers may only view activities for their own orders.
// Admins and staff may view activities for all orders.
async function getOrderActivities(user, orderId) {
  const orderResult = await db.query("SELECT * FROM orders WHERE id = $1", [orderId]);
  const order = orderResult.rows[0];
  if (!order) throw ApiError.notFound("Order not found");

  if (user.role === ROLES.CUSTOMER && order.customerid !== user.id) {
    throw ApiError.forbidden("You do not have access to this order");
  }

  const result = await db.query(
    `SELECT a.*, u.name AS userName, u.role AS userRole
     FROM order_activities a
     LEFT JOIN users u ON u.id = a.userid
     WHERE a.orderid = $1
     ORDER BY a.createdat ASC`,
    [orderId]
  );

  return result.rows;
}

module.exports = { recordActivity, getOrderActivities };