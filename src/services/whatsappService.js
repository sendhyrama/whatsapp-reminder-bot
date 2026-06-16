const axios = require("axios");
require("dotenv").config();

const FONNTE_API_URL = "https://api.fonnte.com/send";

/**
 * Send a WhatsApp message to a target (group or personal) via Fonnte.
 * @param {string} target - WhatsApp number or group ID
 * @param {string} message - Message text (supports WhatsApp markdown)
 * @returns {Promise<void>}
 */
async function sendMessage(target, message) {
  try {
    const response = await axios.post(
      FONNTE_API_URL,
      {
        target,
        message,
        delay: 1, // seconds between messages (Fonnte param)
      },
      {
        headers: {
          Authorization: process.env.FONNTE_TOKEN,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`[WhatsApp] Message sent to ${target}:`, response.data);
  } catch (error) {
    console.error(
      "[WhatsApp] Failed to send message:",
      error.response?.data || error.message
    );
  }
}

module.exports = { sendMessage };