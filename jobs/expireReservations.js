const db = require("../common/db");
const ORDER_STATUS = require("../common/constants/orderStatus");
const INVENTORY_ACTION = require("../common/constants/inventoryAction");
const NOTIFICATION_TYPE = require("../common/constants/notificationType");
const inventoryService = require("../modules/inventory/inventoryServices");
const activityService = require("../modules/activities/activityServices");
const notificationService = require("../modules/notifications/notificationServices");
const logger = require("../common/logger");

/**
 * Finds every PENDING order whose reservation has expired, and for each
 * one: releases the reserved stock, marks it EXPIRED, and logs the
 * change — all inside one transaction per order so a crash halfway
 * through never leaves stock in a half-released state.
 *
 * Safe to run repeatedly: once an order's status flips to EXPIRED, the
 * WHERE status = 'PENDING' clause excludes it from future runs, so the
 * same stock can never be released twice.
 */
async function expireReservations() {
  const expiredResult = await db.query(
    `SELECT * FROM orders WHERE status = $1 AND reservationexpiry < NOW()`,
    [ORDER_STATUS.PENDING]
  );

  if (expiredResult.rows.length === 0) {
    logger.info("Reservation expiry job: no expired orders found");
    return { processed: 0 };
  }

  let processedCount = 0;

  for (const order of expiredResult.rows) {
    try {
      await db.withTransaction(async (client) => {
        
        const lockedResult = await client.query(
          "SELECT * FROM orders WHERE id = $1 AND status = $2 FOR UPDATE",
          [order.id, ORDER_STATUS.PENDING]
        );
        const lockedOrder = lockedResult.rows[0];
        if (!lockedOrder) return; // already handled by another run

        const itemsResult = await client.query(
          "SELECT * FROM order_items WHERE orderid = $1",
          [order.id]
        );

        for (const item of itemsResult.rows) {
          const productResult = await client.query(
            "SELECT * FROM products WHERE id = $1 FOR UPDATE",
            [item.productid]
          );
          const product = productResult.rows[0];
          if (!product) continue;

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
              orderId: order.id,
              userId: order.customerid,
              reason: "Reservation expired automatically",
            },
            client
          );
        }

        await client.query(
          "UPDATE orders SET status = $1, updatedat = CURRENT_TIMESTAMP WHERE id = $2",
          [ORDER_STATUS.EXPIRED, order.id]
        );

        await activityService.recordActivity(
          {
            orderId: order.id,
            action: "ORDER_EXPIRED",
            previousValue: ORDER_STATUS.PENDING,
            newValue: ORDER_STATUS.EXPIRED,
            userId: null, // system-triggered, not a specific user
          },
          client
        );
      });

      await notificationService.queueNotification({
        userId: order.customerid,
        orderId: order.id,
        type: NOTIFICATION_TYPE.ORDER_EXPIRED,
        message: `Your order ${order.ordernumber} has expired and the reserved stock has been released.`,
      });

      processedCount++;
      logger.info("Order reservation expired", { orderId: order.id });
    } catch (error) {
      logger.error("Failed to expire order reservation", {
        orderId: order.id,
        error: error.message,
      });
    }
  }

  return { processed: processedCount };
}

module.exports = expireReservations;