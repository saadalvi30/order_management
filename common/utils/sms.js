const axios = require("axios");
const logger = require("../logger");

async function sendSms({ to, message }) {
  try {
    const response = await axios.post("https://textbelt.com/text", {
      phone: to,
      message: message,
      key: "textbelt",
    });

    if (response.data.success) {
      logger.info("SMS sent via Textbelt", { to });
      return { success: true, simulated: false };
    } else {
      throw new Error(response.data.error || "Textbelt failed");
    }
  } catch (error) {
    logger.warn("Real SMS failed, falling back to simulation", {
      to,
      error: error.message,
    });
    logger.info("SMS simulated (not actually sent)", { to, message });
    return { success: true, simulated: true };
  }
}

module.exports = { sendSms };