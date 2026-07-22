const db = require("../../common/db");
const ApiError = require("../../common/utils/apiError");
const ORDER_STATUS = require("../../common/constants/orderStatus");
const PRODUCT_STATUS = require("../../common/constants/productStatus");
const INVENTORY_ACTION = require("../../common/constants/inventoryAction");
const generateOrderNumber = require("../../common/utils/generateOrderNumber");
const inventoryService = require("../inventory/inventoryServices");
const ROLES = require("../../common/constants/role");
const activityService = require("../activities/activityServices");
const notificationService = require("../notifications/notificationServices");
const NOTIFICATION_TYPE = require("../../common/constants/notificationType");
const logger = require("../../common/logger");

const RESERVATION_EXPIRY_MINUTES = Number(process.env.RESERVATION_EXPIRY_MINUTES) || 15;

function validateCreateOrderInput({ items }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw ApiError.badRequest("items must be a non-empty array");
  }

  const productIds = new Set();
  for (const item of items) {
    if (!item.productId) {
      throw ApiError.badRequest("each item must have a productId");
    }
    if (!item.quantity || item.quantity <= 0) {
      throw ApiError.badRequest("each item quantity must be a positive number");
    }
    if (productIds.has(item.productId)) {
      throw ApiError.badRequest(`duplicate productId in order items: ${item.productId}`);
    }
    productIds.add(item.productId);
  }
}

/**
 * The core of the whole assignment: creates an order and reserves stock
 * atomically. Everything happens inside one database transaction using
 * SELECT ... FOR UPDATE row locks, so two customers can never reserve
 * the same final unit of stock.
 */
async function createOrder(user, body, idempotencyKey) {
  validateCreateOrderInput(body);
  const { items } = body;

  if (idempotencyKey) {
    const existing = await db.query(
      "SELECT orderid, responsedata FROM idempotency_keys WHERE customerid = $1 AND idempotencykey = $2",
      [user.id, idempotencyKey]
    );
    if (existing.rows[0]) {
      logger.info("Duplicate idempotency key received — returning original order", {
        userId: user.id,
        idempotencyKey,
        orderId: existing.rows[0].orderid,
      });
      return existing.rows[0].responsedata;
    }
  }

  const result = await db.withTransaction(async (client) => {
    let subtotal = 0;
    const orderItemsData = [];

    for (const item of items) {
      const productResult = await client.query(
        "SELECT * FROM products WHERE id = $1 AND deletedat IS NULL FOR UPDATE",
        [item.productId]
      );
      const product = productResult.rows[0];

      if (!product) {
        throw ApiError.notFound(`Product not found: ${item.productId}`);
      }
      if (product.status !== PRODUCT_STATUS.ACTIVE) {
        throw ApiError.conflict(`Product ${product.productcode} is not active`);
      }

      const available = product.availableqty;
      if (available < item.quantity) {
        throw ApiError.conflict(
          `Insufficient stock for product ${product.productcode}. Available: ${available}, requested: ${item.quantity}`
        );
      }

      const lineTotal = Number(product.price) * item.quantity;
      subtotal += lineTotal;

      orderItemsData.push({
        productId: product.id,
        productName: product.name,
        productCode: product.productcode,
        unitPrice: product.price,
        quantity: item.quantity,
        lineTotal,
        previousAvailable: available,
        previousReserved: product.reservedqty,
      });
    }

    const total = subtotal; // extend here later if tax/discount logic is added
    const orderNumber = generateOrderNumber();
    const expiresAt = new Date(Date.now() + RESERVATION_EXPIRY_MINUTES * 60 * 1000);

    const orderInsert = await client.query(
      `INSERT INTO orders (ordernumber, customerid, status, subtotal, total, reservationexpiry)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [orderNumber, user.id, ORDER_STATUS.PENDING, subtotal, total, expiresAt]
    );
    const order = orderInsert.rows[0];

    // Reserve stock + create order items + inventory history for each product
    for (const item of orderItemsData) {
      const newAvailable = item.previousAvailable - item.quantity;
      const newReserved = item.previousReserved + item.quantity;

      await client.query(
        "UPDATE products SET availableqty = $1, reservedqty = $2, updatedat = CURRENT_TIMESTAMP WHERE id = $3",
        [newAvailable, newReserved, item.productId]
      );

      await client.query(
        `INSERT INTO order_items (orderid, productid, productname, productcode, unitprice, quantity, linetotal)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [order.id, item.productId, item.productName, item.productCode, item.unitPrice, item.quantity, item.lineTotal]
      );

      await inventoryService.recordInventoryChange(
        {
          productId: item.productId,
          action: INVENTORY_ACTION.STOCK_RESERVED,
          previousQty: item.previousAvailable,
          changedQty: item.quantity,
          newQty: newAvailable,
          orderId: order.id,
          userId: user.id,
          reason: "Stock reserved for new order",
        },
        client
      );
    }

    await activityService.recordActivity(
      {
        orderId: order.id,
        action: "ORDER_CREATED",
        previousValue: null,
        newValue: ORDER_STATUS.PENDING,
        userId: user.id,
      },
      client
    );

    logger.info("Order created", { orderId: order.id, orderNumber, customerId: user.id, total });

    return { order, items: orderItemsData };
  });

  const responseData = {
    ...result.order,
    items: result.items.map((i) => ({
      productId: i.productId,
      productName: i.productName,
      productCode: i.productCode,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      lineTotal: i.lineTotal,
    })),
  };

  // Save idempotency record AFTER successful commit
  if (idempotencyKey) {
    await db.query(
      `INSERT INTO idempotency_keys (customerid, idempotencykey, orderid, responsedata)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (customerid, idempotencykey) DO NOTHING`,
      [user.id, idempotencyKey, result.order.id, JSON.stringify(responseData)]
    );
  }

  // Queue notification — fire and forget, does not block the response
  notificationService
    .queueNotification({
      userId: user.id,
      orderId: result.order.id,
      type: NOTIFICATION_TYPE.ORDER_CREATED,
      message: `Your order ${result.order.ordernumber} has been placed and stock reserved.`,
    })
    .catch((err) => logger.error("Failed to queue order-created notification", { error: err.message }));

  return responseData;
}

module.exports = { createOrder };
const { assertValidTransition } = require("../../common/utils/orderStatusWorkflow");

// --- List orders (scoped by role, with filters) ---
async function listOrders(user, query) {
  const { page = 1, limit = 10, status, customerId, orderNumber, from, to, sort } = query;

  const conditions = [];
  const params = [];

  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  // Role-based visibility
  if (user.role === ROLES.CUSTOMER) {
    conditions.push(`customerid = ${addParam(user.id)}`);
  } else if (customerId) {
    conditions.push(`customerid = ${addParam(customerId)}`);
  }
  // Admin/Staff see everything unless customerId filter given

  if (status) {
    conditions.push(`status = ${addParam(status)}`);
  }
  if (orderNumber) {
    conditions.push(`ordernumber ILIKE ${addParam(`%${orderNumber}%`)}`);
  }
  if (from) {
    conditions.push(`createdat >= ${addParam(from)}`);
  }
  if (to) {
    conditions.push(`createdat <= ${addParam(to)}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const order = sort === "asc" ? "ASC" : "DESC";
  const { offset, limit: safeLimit } = getOffsetLimit(page, limit);

  const whereParams = [...params];
  const limitPlaceholder = addParam(safeLimit);
  const offsetPlaceholder = addParam(offset);

  const rowsResult = await db.query(
    `SELECT * FROM orders ${whereClause} ORDER BY createdat ${order} LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`,
    params
  );

  const countResult = await db.query(
    `SELECT COUNT(*) AS total FROM orders ${whereClause}`,
    whereParams
  );

  const total = Number(countResult.rows[0].total);

  return {
    data: rowsResult.rows,
    pagination: buildPaginationMeta(page, limit, total),
  };
}

async function getOrderRaw(id) {
  const result = await db.query("SELECT * FROM orders WHERE id = $1", [id]);
  return result.rows[0];
}

function assertCanViewOrder(user, order) {
  if (user.role === ROLES.ADMIN || user.role === ROLES.STAFF) return;
  if (user.role === ROLES.CUSTOMER && order.customerid === user.id) return;
  throw ApiError.forbidden("You do not have access to this order");
}

async function getOrderById(user, id) {
  const order = await getOrderRaw(id);
  if (!order) throw ApiError.notFound("Order not found");
  assertCanViewOrder(user, order);

  const itemsResult = await db.query("SELECT * FROM order_items WHERE orderid = $1", [id]);

  return { ...order, items: itemsResult.rows };
}

// --- Confirm order: PENDING -> CONFIRMED, reserved stock stays reserved but order is locked in ---
async function confirmOrder(user, id) {
  const order = await getOrderRaw(id);
  if (!order) throw ApiError.notFound("Order not found");
  assertCanViewOrder(user, order);

  assertValidTransition(order.status, ORDER_STATUS.CONFIRMED);

  const updateResult = await db.query(
    `UPDATE orders SET status = $1, confirmedat = CURRENT_TIMESTAMP, updatedat = CURRENT_TIMESTAMP
     WHERE id = $2 RETURNING *`,
    [ORDER_STATUS.CONFIRMED, id]
  );

  await activityService.recordActivity({
    orderId: id,
    action: "ORDER_CONFIRMED",
    previousValue: order.status,
    newValue: ORDER_STATUS.CONFIRMED,
    userId: user.id,
  });

  await notificationService.queueNotification({
    userId: order.customerid,
    orderId: id,
    type: NOTIFICATION_TYPE.ORDER_CONFIRMED,
    message: `Your order ${order.ordernumber} has been confirmed.`,
  });

  logger.info("Order confirmed", { orderId: id, userId: user.id });

  return updateResult.rows[0];
}

// --- Generic status update (admin/staff moving order through fulfilment stages) ---
async function updateOrderStatus(user, id, newStatus) {
  const order = await getOrderRaw(id);
  if (!order) throw ApiError.notFound("Order not found");

  assertValidTransition(order.status, newStatus);

  const updateResult = await db.query(
    "UPDATE orders SET status = $1, updatedat = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
    [newStatus, id]
  );

  await activityService.recordActivity({
    orderId: id,
    action: "STATUS_CHANGED",
    previousValue: order.status,
    newValue: newStatus,
    userId: user.id,
  });

  if (newStatus === ORDER_STATUS.READY) {
    await notificationService.queueNotification({
      userId: order.customerid,
      orderId: id,
      type: NOTIFICATION_TYPE.ORDER_READY,
      message: `Your order ${order.ordernumber} is ready.`,
    });
  }

  logger.info("Order status changed", { orderId: id, from: order.status, to: newStatus, userId: user.id });

  return updateResult.rows[0];
}

// --- Cancel order: restores stock atomically ---
async function cancelOrder(user, id) {
  const order = await getOrderRaw(id);
  if (!order) throw ApiError.notFound("Order not found");
  assertCanViewOrder(user, order);

  const cancellableStatuses = [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED];
  if (!cancellableStatuses.includes(order.status)) {
    throw ApiError.badRequest(
      `Cannot cancel an order with status ${order.status}. Only PENDING or CONFIRMED orders can be cancelled.`
    );
  }

  const result = await db.withTransaction(async (client) => {
    const itemsResult = await client.query("SELECT * FROM order_items WHERE orderid = $1", [id]);

    for (const item of itemsResult.rows) {
      const productResult = await client.query(
        "SELECT * FROM products WHERE id = $1 FOR UPDATE",
        [item.productid]
      );
      const product = productResult.rows[0];
      if (!product) continue; // product might have been hard-removed in edge cases — skip safely

      const previousAvailable = product.availableqty;
      const previousReserved = product.reservedqty;
      const newAvailable = previousAvailable + item.quantity;
      const newReserved = Math.max(0, previousReserved - item.quantity);

      await client.query(
        "UPDATE products SET availableqty = $1, reservedqty = $2, updatedat = CURRENT_TIMESTAMP WHERE id = $3",
        [newAvailable, newReserved, item.productid]
      );

      await inventoryService.recordInventoryChange(
        {
          productId: item.productid,
          action: INVENTORY_ACTION.RESERVATION_RELEASED,
          previousQty: previousAvailable,
          changedQty: item.quantity,
          newQty: newAvailable,
          orderId: id,
          userId: user.id,
          reason: "Order cancelled",
        },
        client
      );
    }

    const updateResult = await client.query(
      `UPDATE orders SET status = $1, cancelledat = CURRENT_TIMESTAMP, updatedat = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING *`,
      [ORDER_STATUS.CANCELLED, id]
    );

    await activityService.recordActivity(
      {
        orderId: id,
        action: "ORDER_CANCELLED",
        previousValue: order.status,
        newValue: ORDER_STATUS.CANCELLED,
        userId: user.id,
      },
      client
    );

    return updateResult.rows[0];
  });

  await notificationService.queueNotification({
    userId: order.customerid,
    orderId: id,
    type: NOTIFICATION_TYPE.ORDER_CANCELLED,
    message: `Your order ${order.ordernumber} has been cancelled and stock restored.`,
  });

  logger.info("Order cancelled", { orderId: id, userId: user.id });

  return result;
}

module.exports = {
  createOrder,
  listOrders,
  getOrderById,
  confirmOrder,
  updateOrderStatus,
  cancelOrder,
};