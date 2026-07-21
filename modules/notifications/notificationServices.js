const db = require("../../common/db");
const logger = require("../../common/logger");
const mailer = require("../../common/utils/mailer");

const MAX_RETRY_COUNT = 3;

/**
 * Adds a notification to the queue. Does NOT send anything itself —
 * actual delivery happens in the background worker (processQueue),
 * so this call is fast and never blocks the API response.
 */
async function queueNotification({ userId, orderId, type, message }, client = db) {
  await client.query(
    `INSERT INTO notifications (userid, orderid, type, message, status)
     VALUES ($1, $2, $3, $4, 'PENDING')`,
    [userId, orderId, type, message]
  );
}

/**
 * Background worker logic — picks up PENDING/FAILED notifications
 * (under the retry limit) and attempts delivery. Called on a schedule
 * by the cron job in jobs/notificationWorker.js.
 */
async function processQueue() {
  const pending = await db.query(
    `SELECT n.*, u.email AS userEmail, u.name AS userName
     FROM notifications n
     JOIN users u ON u.id = n.userid
     WHERE n.status IN ('PENDING', 'FAILED') AND n.retrycount < $1
     ORDER BY n.createdat ASC
     LIMIT 20`,
    [MAX_RETRY_COUNT]
  );

  for (const notification of pending.rows) {
    try {
      await db.query("UPDATE notifications SET status = 'PROCESSING' WHERE id = $1", [notification.id]);

      await mailer.sendNotificationEmail({
        to: notification.useremail,
        name: notification.username,
        message: notification.message,
        type: notification.type,
      });

      await db.query(
        "UPDATE notifications SET status = 'SENT', sentat = CURRENT_TIMESTAMP WHERE id = $1",
        [notification.id]
      );

      logger.info("Notification sent", { notificationId: notification.id, type: notification.type });
    } catch (error) {
      const newRetryCount = notification.retrycount + 1;
      const isFinalFailure = newRetryCount >= MAX_RETRY_COUNT;

      await db.query(
        `UPDATE notifications
         SET status = 'FAILED', retrycount = $1, failedat = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [newRetryCount, notification.id]
      );

      logger.warn("Notification delivery failed, will retry", {
        notificationId: notification.id,
        retryCount: newRetryCount,
        finalFailure: isFinalFailure,
        error: error.message,
      });
    }
  }
}

module.exports = { queueNotification, processQueue };