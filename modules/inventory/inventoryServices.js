const db = require("../../common/db");
const ApiError = require("../../common/utils/apiError");
const { getOffsetLimit, buildPaginationMeta } = require("../../common/utils/pagination");

/**
 * Records one row in inventory_history. This is the single place every
 * other module (products, orders, jobs) calls whenever stock changes,
 * so nothing can touch stock without leaving an audit trail.
 *
 * IMPORTANT: pass `client` when calling this from inside a transaction
 * (order creation, cancellation, expiry) so the history insert is part
 * of the same COMMIT/ROLLBACK as the stock change itself.
 */
async function recordInventoryChange(
  { productId, action, previousQty, changedQty, newQty, orderId, userId, reason },
  client = db
) {
  await client.query(
    `INSERT INTO inventory_history 
       (productid, action, previousqty, changedqty, newqty, orderid, userid, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [productId, action, previousQty, changedQty, newQty, orderId || null, userId, reason || null]
  );
}

async function getProductHistory(productId, query) {
  const { page = 1, limit = 10 } = query;
  const { offset, limit: safeLimit } = getOffsetLimit(page, limit);

  const productResult = await db.query(
    "SELECT id FROM products WHERE id = $1 AND deletedat IS NULL",
    [productId]
  );
  if (!productResult.rows[0]) {
    throw ApiError.notFound("Product not found");
  }

  const rowsResult = await db.query(
    `SELECT h.*, u.name AS userName, u.email AS userEmail
     FROM inventory_history h
     JOIN users u ON u.id = h.userid
     WHERE h.productid = $1
     ORDER BY h.createdat DESC
     LIMIT $2 OFFSET $3`,
    [productId, safeLimit, offset]
  );

  const countResult = await db.query(
    "SELECT COUNT(*) AS total FROM inventory_history WHERE productid = $1",
    [productId]
  );

  const total = Number(countResult.rows[0].total);

  return {
    data: rowsResult.rows,
    pagination: buildPaginationMeta(page, limit, total),
  };
}

module.exports = { recordInventoryChange, getProductHistory };                      