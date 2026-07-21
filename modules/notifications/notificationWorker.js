const logger = require("../../common/logger");
const { processQueue } = require("./notificationServices");

async function runNotificationWorker() {
  try {
    logger.info("Notification worker started");
    await processQueue();
    logger.info("Notification worker finished");
  } catch (error) {
    logger.error("Notification worker failed", { error: error.message });
  }
}

module.exports = runNotificationWorker;
