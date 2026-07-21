const cron = require("node-cron");
const expireReservations = require("./expireReservations");
const runNotificationWorker = require("../modules/notifications/notificationWorker");
const logger = require("../common/logger");

function startScheduler() {
  cron.schedule("* * * * *", async () => {
    logger.info("Running reservation expiry job");
    const result = await expireReservations();
    logger.info("Reservation expiry job finished", result);
  });

  cron.schedule("*/1000 * * * * *", async () => {
    await runNotificationWorker();
  });

  logger.info("Background job scheduler started");
}

module.exports = { startScheduler };