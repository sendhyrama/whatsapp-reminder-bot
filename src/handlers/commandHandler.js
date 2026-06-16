const { addOrder, deleteOrder, editOrder, listOrders } = require("../services/orderService");
const { isValidDate, isValidTime, formatDate, formatTime } = require("../utils/dateUtils");
require("dotenv").config();

const BOT_MENTION = process.env.BOT_MENTION || "@bot";

function isBotMentioned(message) {
  return message.toLowerCase().includes(BOT_MENTION.toLowerCase());
}

/**
 * Build a formatted order line for list display.
 * @param {object} order
 * @param {number} index - 1-based
 */
function formatOrderLine(order, index) {
  const time = order.time ? ` ${formatTime(order.time)}` : "";
  return `${index}. *${order.name}* — ${formatDate(order.date)}${time}`;
}

function handleCommand(message, sender) {
  if (!isBotMentioned(message)) return null;

  if (process.env.BOT_OWN_NUMBER && sender === process.env.BOT_OWN_NUMBER) {
    return null;
  }

  // Remove bot mention and normalize
  const cleaned = message
    .toLowerCase()
    .replace(BOT_MENTION.toLowerCase(), "")
    .trim();

  // ── ADD ORDER ────────────────────────────────────────────────────────────
  // Usage: @bot add order <name> <DD-MM-YYYY> [HH.MM]
  if (cleaned.startsWith("add order")) {
    const parts = cleaned.replace("add order", "").trim().split(/\s+/);

    if (parts.length < 2) {
      return (
        "⚠️ Usage: `@bot add order <name> <DD-MM-YYYY> [HH.MM]`\n" +
        "Example: `@bot add order ABC 21-06-2026 08.00`"
      );
    }

    const [name, date, time] = parts;

    if (!isValidDate(date)) {
      return (
        `⚠️ Invalid date: *${date}*\n` +
        "Please use format DD-MM-YYYY\n" +
        "Example: 21-06-2026"
      );
    }

    if (time && !isValidTime(time)) {
      return (
        `⚠️ Invalid time: *${time}*\n` +
        "Please use 24-hour format HH.MM\n" +
        "Example: 08.00 or 14.30"
      );
    }

    const result = addOrder(name.toUpperCase(), date, time || null);

    if (!result.success) return result.message;

    const o = result.order;
    const timeStr = o.time ? ` at *${formatTime(o.time)}*` : "";
    return (
      `✅ Order saved!\n` +
      `Order: *${o.name}*\n` +
      `Date: ${formatDate(o.date)}${timeStr}`
    );
  }

  // ── LIST ─────────────────────────────────────────────────────────────────
  if (cleaned === "list") {
    const orders = listOrders();
    if (orders.length === 0) return "📋 No orders saved yet.";

    const lines = orders.map((o, i) => formatOrderLine(o, i + 1));
    return `📋 *Order List (${orders.length}):*\n${lines.join("\n")}`;
  }

  // ── DELETE ───────────────────────────────────────────────────────────────
  // Usage: @bot delete <name|number>
  if (cleaned.startsWith("delete")) {
    const target = cleaned.replace("delete", "").trim();

    if (!target) {
      return (
        "⚠️ Usage: `@bot delete <name|number>`\n" +
        "Example: `@bot delete ABC` or `@bot delete 1`"
      );
    }

    const result = deleteOrder(target);
    if (!result.success) return result.message;

    return (
      `🗑️ Deleted!\n` +
      `Order: *${result.order.name}*\n` +
      `Date: ${formatDate(result.order.date)}`
    );
  }

  // ── EDIT ─────────────────────────────────────────────────────────────────
  // Usage:
  //   @bot edit <name|number> name <newname>
  //   @bot edit <name|number> date <DD-MM-YYYY>
  //   @bot edit <name|number> time <HH.MM>
  //   @bot edit <name|number> time clear    ← remove time
  if (cleaned.startsWith("edit")) {
    const parts = cleaned.replace("edit", "").trim().split(/\s+/);

    // parts[0] = name or number
    // parts[1] = field (name | date | time)
    // parts[2] = new value
    if (parts.length < 3) {
      return (
        "⚠️ Usage:\n" +
        "`@bot edit <name|number> name <newname>`\n" +
        "`@bot edit <name|number> date <DD-MM-YYYY>`\n" +
        "`@bot edit <name|number> time <HH.MM>`\n" +
        "`@bot edit <name|number> time clear`"
      );
    }

    const [target, field, newValue] = parts;

    // Validate field
    if (!["name", "date", "time"].includes(field)) {
      return `⚠️ Unknown field: *${field}*. Use: name, date, or time.`;
    }

    // Build updates object
    const updates = {};

    if (field === "name") {
      updates.name = newValue.toUpperCase();

    } else if (field === "date") {
      if (!isValidDate(newValue)) {
        return (
          `⚠️ Invalid date: *${newValue}*\n` +
          "Use format DD-MM-YYYY. Example: 21-06-2026"
        );
      }
      updates.date = newValue;

    } else if (field === "time") {
      if (newValue === "clear") {
        // Allow clearing the time
        updates.time = null;
      } else if (!isValidTime(newValue)) {
        return (
          `⚠️ Invalid time: *${newValue}*\n` +
          "Use 24-hour format HH.MM. Example: 08.00 or 14.30"
        );
      } else {
        updates.time = newValue;
      }
    }

    const result = editOrder(target, updates);
    if (!result.success) return result.message;

    const o = result.order;
    const timeStr = o.time ? ` at *${formatTime(o.time)}*` : "";
    return (
      `✏️ Order updated!\n` +
      `Order: *${o.name}*\n` +
      `Date: ${formatDate(o.date)}${timeStr}`
    );
  }

  // ── HELP / FALLBACK ───────────────────────────────────────────────────────
  return (
    "🤖 *Available commands:*\n" +
    "`@bot add order <name> <DD-MM-YYYY> [HH.MM]`\n" +
    "`@bot list`\n" +
    "`@bot delete <name|number>`\n" +
    "`@bot edit <name|number> name <newname>`\n" +
    "`@bot edit <name|number> date <DD-MM-YYYY>`\n" +
    "`@bot edit <name|number> time <HH.MM>`"
  );
}

module.exports = { handleCommand, isBotMentioned };