const axios = require("axios");
require("dotenv").config();

const FONNTE_API_URL = "https://api.fonnte.com/send";

/**
 * Send a WhatsApp message via Fonnte.
 * @param {string} target - Group ID or phone number
 * @param {string} message - Message text
 */
async function sendMessage(target, message) {
  try {
    const params = new URLSearchParams();
    params.append("target", target);
    params.append("message", message);
    params.append("delay", "1");
    params.append("countryCode", "62");

    const response = await axios.post(FONNTE_API_URL, params, {
      headers: {
        Authorization: process.env.FONNTE_TOKEN,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    console.log(`[WhatsApp] Message sent to ${target}:`, response.data);
  } catch (error) {
    console.error(
      "[WhatsApp] Failed to send message:",
      error.response?.data || error.message
    );
  }
}

module.exports = { sendMessage };