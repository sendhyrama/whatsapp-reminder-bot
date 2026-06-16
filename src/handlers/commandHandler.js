const { addOrder, deleteOrder, editOrder, listOrders } = require("../services/orderService");
const { isValidDate, isValidTime, formatDate, formatTime } = require("../utils/dateUtils");
require("dotenv").config();

const BOT_MENTION = process.env.BOT_MENTION || "@bot";

/**
 * Parse "add order" arguments where name can be multi-word.
 * Uses the date (DD-MM-YYYY) as the anchor point.
 *
 * Input:  "My Big Order 21-06-2026 08.00"
 * Output: { name: "My Big Order", date: "21-06-2026", time: "08.00" }
 *
 * @param {string} str - everything after "add order"
 * @returns {{ name: string, date: string, time: string|null } | null}
 */
function parseAddArgs(str) {
  // Match DD-MM-YYYY anywhere in the string
  const dateRegex = /(\d{2}-\d{2}-\d{4})/;
  const match = str.match(dateRegex);

  if (!match) return null;

  const dateIndex = str.indexOf(match[1]);
  const name = str.slice(0, dateIndex).trim();
  const rest = str.slice(dateIndex + match[1].length).trim();
  const time = rest || null;

  return { name, date: match[1], time };
}

/**
 * Parse "edit" arguments where name/number is always the first token,
 * field is second, and new value (possibly multi-word for name) is the rest.
 *
 * Input:  "1 name My New Order Name"
 * Output: { target: "1", field: "name", newValue: "My New Order Name" }
 *
 * @param {string} str - everything after "edit"
 * @returns {{ target: string, field: string, newValue: string } | null}
 */
function parseEditArgs(str) {
  const parts = str.trim().split(/\s+/);
  if (parts.length < 3) return null;

  const target = parts[0];
  const field = parts[1];
  // Everything after field = new value (supports multi-word names)
  const newValue = parts.slice(2).join(" ");

  return { target, field, newValue };
}

function isBotMentioned(message) {
  return message.toLowerCase().includes(BOT_MENTION.toLowerCase());
}

function formatOrderLine(order, index) {
  const time = order.time ? ` ${formatTime(order.time)}` : "";
  return `${index}. *${order.name}* — ${formatDate(order.date)}${time}`;
}

function handleCommand(message, sender) {
  if (!isBotMentioned(message)) return null;

  if (process.env.BOT_OWN_NUMBER && sender === process.env.BOT_OWN_NUMBER) {
    return null;
  }

  const cleaned = message
    .toLowerCase()
    .replace(BOT_MENTION.toLowerCase(), "")
    .trim();

  // We need the original message (preserve casing) for name extraction
  const original = message
    .replace(new RegExp(BOT_MENTION, "i"), "")
    .trim();

  // ── ADD ORDER ─────────────────────────────────────────────────────────────
  // Usage: @bot add order <name can be multi word> <DD-MM-YYYY> [HH.MM]
  if (cleaned.startsWith("add order")) {
    const argStr = original.replace(/^add order\s*/i, "");
    const parsed = parseAddArgs(argStr);

    if (!parsed || !parsed.name || !parsed.date) {
      return (
        "⚠️ Usage: `@bot add order <name> <DD-MM-YYYY> [HH.MM]`\n" +
        "Example: `@bot add order My Big Order 21-06-2026 08.00`"
      );
    }

    const { name, date, time } = parsed;

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
  // Name can be multi-word here too e.g. "@bot delete My Big Order"
  if (cleaned.startsWith("delete")) {
    const target = original.replace(/^delete\s*/i, "").trim();

    if (!target) {
      return (
        "⚠️ Usage: `@bot delete <name|number>`\n" +
        "Example: `@bot delete My Big Order` or `@bot delete 1`"
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

  // ── EDIT ──────────────────────────────────────────────────────────────────
  // Usage:
  //   @bot edit <name|number> name <new name can be multi word>
  //   @bot edit <name|number> date <DD-MM-YYYY>
  //   @bot edit <name|number> time <HH.MM>
  //   @bot edit <name|number> time clear
  if (cleaned.startsWith("edit")) {
    const argStr = original.replace(/^edit\s*/i, "").trim();
    const parsed = parseEditArgs(argStr);

    if (!parsed) {
      return (
        "⚠️ Usage:\n" +
        "`@bot edit <name|number> name <new name>`\n" +
        "`@bot edit <name|number> date <DD-MM-YYYY>`\n" +
        "`@bot edit <name|number> time <HH.MM>`\n" +
        "`@bot edit <name|number> time clear`"
      );
    }

    const { target, field, newValue } = parsed;

    if (!["name", "date", "time"].includes(field.toLowerCase())) {
      return `⚠️ Unknown field: *${field}*. Use: name, date, or time.`;
    }

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
      if (newValue.toLowerCase() === "clear") {
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

  // ── HELP ──────────────────────────────────────────────────────────────────
  return (
    "🤖 *Available commands:*\n" +
    "`@bot add order <name> <DD-MM-YYYY> [HH.MM]`\n" +
    "`@bot list`\n" +
    "`@bot delete <name|number>`\n" +
    "`@bot edit <name|number> name <new name>`\n" +
    "`@bot edit <name|number> date <DD-MM-YYYY>`\n" +
    "`@bot edit <name|number> time <HH.MM>`"
  );
}

module.exports = { handleCommand, isBotMentioned };