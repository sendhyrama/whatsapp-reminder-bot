const { addOrder, deleteOrder, listOrders } = require("../services/orderService");
const { isValidDate, formatDate } = require("../utils/dateUtils");
require("dotenv").config();

const BOT_MENTION = process.env.BOT_MENTION || "@bot";

/**
 * Check if a message is directed at the bot.
 * @param {string} message
 * @returns {boolean}
 */
function isBotMentioned(message) {
  return message.toLowerCase().includes(BOT_MENTION.toLowerCase());
}

/**
 * Parse and handle an incoming message.
 * Returns a reply string, or null if the bot should not respond.
 *
 * Supported commands:
 *   @bot add order <name> <YYYY-MM-DD>
 *   @bot list
 *   @bot delete <name>
 *
 * @param {string} message - Raw incoming message text
 * @param {string} sender  - Sender ID (to prevent bot replying to itself)
 * @returns {string|null}
 */
function handleCommand(message, sender) {
  // ── Guard: ignore if bot is not mentioned ──────────────────────────────────
  if (!isBotMentioned(message)) return null;

  // ── Guard: ignore messages sent by the bot's own number ───────────────────
  // Fonnte sends outgoing messages back as webhooks too.
  // Set BOT_OWN_NUMBER in .env to your bot's WhatsApp number.
  if (process.env.BOT_OWN_NUMBER && sender === process.env.BOT_OWN_NUMBER) {
    console.log("[Bot] Ignoring own message.");
    return null;
  }

  // Normalize: lowercase, trim, remove the bot mention for easier parsing
  const cleaned = message
    .toLowerCase()
    .replace(BOT_MENTION.toLowerCase(), "")
    .trim();

  // ── Command: add order ─────────────────────────────────────────────────────
  // Pattern: add order <name> <YYYY-MM-DD>
  if (cleaned.startsWith("add order")) {
    const parts = cleaned.replace("add order", "").trim().split(/\s+/);

    // parts[0] = order name, parts[1] = date
    if (parts.length < 2) {
      return (
        "⚠️ Usage: `@bot add order <name> <YYYY-MM-DD>`\n" +
        "Example: `@bot add order ABC 2026-06-20`"
      );
    }

    const [name, date] = parts;

    // Validate date format
    if (!isValidDate(date)) {
      return (
        `⚠️ Invalid date: *${date}*\n` +
        "Please use format YYYY-MM-DD\n" +
        "Example: 2026-06-20"
      );
    }

    const result = addOrder(name.toUpperCase(), date);
    return result.message;
  }

  // ── Command: list ──────────────────────────────────────────────────────────
  if (cleaned === "list") {
    const orders = listOrders();

    if (orders.length === 0) {
      return "📋 No orders saved yet.";
    }

    const lines = orders.map(
      (o, i) => `${i + 1}. *${o.name}* — ${formatDate(o.date)}`
    );

    return `📋 *Order List (${orders.length}):*\n${lines.join("\n")}`;
  }

  // ── Command: delete ────────────────────────────────────────────────────────
  // Pattern: delete <name>
  if (cleaned.startsWith("delete")) {
    const name = cleaned.replace("delete", "").trim();

    if (!name) {
      return "⚠️ Usage: `@bot delete <name>`\nExample: `@bot delete ABC`";
    }

    const result = deleteOrder(name.toUpperCase());
    return result.message;
  }

  // ── Fallback: unknown command ──────────────────────────────────────────────
  return (
    "🤖 *Available commands:*\n" +
    "`@bot add order <name> <YYYY-MM-DD>`\n" +
    "`@bot list`\n" +
    "`@bot delete <name>`"
  );
}

module.exports = { handleCommand, isBotMentioned };