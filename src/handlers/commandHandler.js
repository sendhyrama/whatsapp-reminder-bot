const { addOrder, deleteOrder, editOrder, listOrders } = require("../services/orderService");
const { isValidDate, isValidTime, formatDate, formatTime } = require("../utils/dateUtils");
require("dotenv").config();

const BOT_MENTION = process.env.BOT_MENTION || "@bot";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Validate order name:
 * - Must not be empty
 * - Max 3 words
 * @param {string} name
 * @returns {{ valid: boolean, message: string|null }}
 */
function validateName(name) {
  if (!name || !name.trim()) {
    return { valid: false, message: "⚠️ Name cannot be empty." };
  }

  const wordCount = name.trim().split(/\s+/).length;
  if (wordCount > 3) {
    return {
      valid: false,
      message:
        `⚠️ Name too long: *${name}*\n` +
        `Max 3 words allowed.\n` +
        `Example: \`Budi Santoso\``,
    };
  }
  return { valid: true, message: null };
}

/**
 * Validate cake name (optional):
 * - Max 5 words if provided
 */
function validateCakeName(cake) {
  if (!cake) return { valid: true, message: null };

  const wordCount = cake.trim().split(/\s+/).length;
  if (wordCount > 5) {
    return {
      valid: false,
      message:
        `⚠️ Cake name too long: *${cake}*\n` +
        `Max 5 words allowed.\n` +
        `Example: \`(Black Forest Cake)\``,
    };
  }

  return { valid: true, message: null };
}

/**
 * Extract cake name wrapped in parentheses from a string,
 * and return the remaining string with that part removed.
 *
 * Input:  "Budi Santoso (Black Forest Cake) 21-06-2026 08.00"
 * Output: { cake: "Black Forest Cake", rest: "Budi Santoso 21-06-2026 08.00" }
 */
function extractCakeName(str) {
  const match = str.match(/\(([^)]+)\)/);

  if (!match) {
    return { cake: null, rest: str };
  }

  const cake = match[1].trim();
  const rest = str.replace(match[0], " ").replace(/\s+/g, " ").trim();

  return { cake, rest };
}

/**
 * Parse "add order" arguments:
 * - name can be multi-word (max 3 words)
 * - cake name optional, wrapped in (...)
 * - date (DD-MM-YYYY) used as anchor point
 * - time optional, comes after date
 */
function parseAddArgs(str) {
  const { cake, rest } = extractCakeName(str);
  // Match DD-MM-YYYY anywhere in the string
  const dateRegex = /(\d{2}-\d{2}-\d{4})/;
  const match = rest.match(dateRegex);

  if (!match) return null;

  const dateIndex = rest.indexOf(match[1]);
  const name = rest.slice(0, dateIndex).trim();
  const after = rest.slice(dateIndex + match[1].length).trim();
  const time = after || null;

  return { name, cake, date: match[1], time };
}

/**
 * Parse "edit" arguments.
 * - target = first token (name or number)
 * - field  = second token (nama | tanggal | jam | kue)
 * - newValue = rest of text after field (supports multi-word)
 *
 * Input:  "1 name My New Order"
 * Output: { target: "1", field: "name", newValue: "My New Order" }
 *
 * @param {string} str - everything after "edit"
 * @returns {{ target: string, field: string, newValue: string } | null}
 */
function parseEditArgs(str) {
  const parts = str.trim().split(/\s+/);
  if (parts.length < 3) return null;

  const target = parts[0];
  const field = parts[1].toLowerCase();
  // Everything after field = new value (supports multi-word names)
  const newValue = parts.slice(2).join(" ");

  return { target, field, newValue };
}

/**
 * Check if a message is directed at the bot.
 * @param {string} message
 * @returns {boolean}
 */
function isBotMentioned(message) {
  return message.toLowerCase().includes(BOT_MENTION.toLowerCase());
}

/**
 * Format a single order as a list line.
 * e.g. "1. *BUDI* (Black Forest Cake) — 21 June 2026 08:00"
 * @param {object} order
 * @param {number} index - 1-based
 * @returns {string}
 */
function formatOrderLine(order, index) {
  const cakeStr = order.cake ? ` (${order.cake})` : "";
  const timeStr = order.time ? ` ${formatTime(order.time)}` : "";
  return `${index}. *${order.name}*${cakeStr} — ${formatDate(order.date)}${timeStr}`;
}

// ── Main Handler ──────────────────────────────────────────────────────────────

/**
 * Parse and handle an incoming WhatsApp message.
 * Returns a reply string, or null if the bot should not respond.
 *
 * Commands (Indonesian keywords, English replies):
 *   @bot add order <nama max 3 kata> [(<kue>)] <DD-MM-YYYY> [HH.MM]
 *   @bot list
 *   @bot delete <nama|nomor>
 *   @bot edit <nama|nomor> nama <nama baru>
 *   @bot edit <nama|nomor> tanggal <DD-MM-YYYY>
 *   @bot edit <nama|nomor> jam <HH.MM>
 *   @bot edit <nama|nomor> jam clear
 *   @bot edit <nama|nomor> kue <kue baru>
 *   @bot edit <nama|nomor> kue clear
 *
 * @param {string} message - Raw incoming message text
 * @param {string} sender  - Sender's WhatsApp number
 * @returns {string|null}
 */
function handleCommand(message, sender) {
  // ── Guard: ignore if bot is not mentioned ─────────────────────────────────
  if (!isBotMentioned(message)) return null;

  // ── Guard: ignore the bot's own messages ──────────────────────────────────
  if (process.env.BOT_OWN_NUMBER && sender === process.env.BOT_OWN_NUMBER) {
    console.log("[Bot] Ignoring own message.");
    return null;
  }

  // Lowercase version for command matching
  const cleaned = message
    .toLowerCase()
    .replace(BOT_MENTION.toLowerCase(), "")
    .trim();

  // Original casing version for name extraction (preserve user's casing)
  const original = message
    .replace(new RegExp(BOT_MENTION, "i"), "")
    .trim();

  // ── ADD ORDER ─────────────────────────────────────────────────────────────
  // Usage: @bot add order <name max 3 words> [(<cake name>)] <DD-MM-YYYY> [HH.MM]
  // Example: @bot add order My Big Order 21-06-2026 08.00
  if (cleaned.startsWith("add order")) {
    const argStr = original.replace(/^add order\s*/i, "");
    const parsed = parseAddArgs(argStr);

    if (!parsed || !parsed.name || !parsed.date) {
      return (
        "⚠️ Usage: `@bot add order <nama> [(<kue>)] <DD-MM-YYYY> [HH.MM]`\n" +
        "Example: `@bot add order Budi Santoso (Black Forest Cake) 21-06-2026 08.00`\n" +
        "Note: Name max 3 words. Nama kue optional, dibungkus kurung ()."
      );
    }

    const { name, cake, date, time } = parsed;

    // Validate name
    const nameCheck = validateName(name);
    if (!nameCheck.valid) return nameCheck.message;

    // Validate cake
    const cakeCheck = validateCakeName(cake);
    if (!cakeCheck.valid) return cakeCheck.message;

    // Validate date
    if (!isValidDate(date)) {
      return (
        `⚠️ Invalid date: *${date}*\n` +
        "Please use format DD-MM-YYYY\n" +
        "Example: 21-06-2026"
      );
    }

    // Validate time (optional)
    if (time && !isValidTime(time)) {
      return (
        `⚠️ Invalid time: *${time}*\n` +
        "Please use 24-hour format HH.MM\n" +
        "Example: 08.00 or 14.30"
      );
    }

    const result = addOrder(name.toUpperCase(), date, time || null, cake);
    if (!result.success) return result.message;

    const o = result.order;
    const cakeStr = o.cake ? `\nCake: *${o.cake}*` : "";
    const timeStr = o.time ? ` at *${formatTime(o.time)}*` : "";
    return (
      `✅ Order saved!\n` +
      `Name: *${o.name}*${cakeStr}\n` +
      `Date: ${formatDate(o.date)}${timeStr}`
    );
  }

  // ── LIST ──────────────────────────────────────────────────────────────────
  // Usage: @bot list
  if (cleaned === "list") {
    const orders = listOrders();

    if (orders.length === 0) {
      return "📋 No orders saved yet.";
    }

    const lines = orders.map((o, i) => formatOrderLine(o, i + 1));
    return `📋 *Order List (${orders.length}):*\n${lines.join("\n")}`;
  }

  // ── DELETE ────────────────────────────────────────────────────────────────
  // Usage: @bot delete <name|number>
  // Example: @bot delete My Big Order
  // Example: @bot delete 1
  if (cleaned.startsWith("delete")) {
    const target = original.replace(/^delete\s*/i, "").trim();

    if (!target) {
      return (
        "⚠️ Usage: `@bot delete <nama|nomor>`\n" +
        "Example: `@bot delete Budi Santoso` or `@bot delete 1`"
      );
    }

    const result = deleteOrder(target);
    if (!result.success) return result.message;

    const cakeStr = result.order.cake ? `\nCake: *${result.order.cake}*` : "";
    return (
      `🗑️ Deleted!\n` +
      `Name: *${result.order.name}*${cakeStr}\n` +
      `Date: ${formatDate(result.order.date)}`
    );
  }

  // ── EDIT ──────────────────────────────────────────────────────────────────
  // Usage:
  //   @bot edit <nama|nomor> nama <nama baru>
  //   @bot edit <nama|nomor> tanggal <DD-MM-YYYY>
  //   @bot edit <nama|nomor> jam <HH.MM>
  //   @bot edit <nama|nomor> jam clear
  //   @bot edit <nama|nomor> kue <kue baru>
  //   @bot edit <nama|nomor> kue clear
  if (cleaned.startsWith("edit")) {
    const argStr = original.replace(/^edit\s*/i, "").trim();
    const parsed = parseEditArgs(argStr);

    if (!parsed) {
      return (
        "⚠️ Usage:\n" +
        "`@bot edit <nama|nomor> nama <nama baru>`\n" +
        "`@bot edit <nama|nomor> tanggal <DD-MM-YYYY>`\n" +
        "`@bot edit <nama|nomor> jam <HH.MM>`\n" +
        "`@bot edit <nama|nomor> jam clear`\n" +
        "`@bot edit <nama|nomor> kue <kue baru>`" +
        "`@bot edit <nama|nomor> kue clear`" +
        "Note: Nama max 3 kata"
      );
    }

    const { target, field, newValue } = parsed;

    // Validate field
    if (!["nama", "tanggal", "jam", "kue"].includes(field)) {
      return `⚠️ Unknown field: *${field}*\nAvailable fields: nama, tanggal, jam, kue.`;
    }

    const updates = {};

    if (field === "nama") {
      // Validate new name
      const nameCheck = validateName(newValue);
      if (!nameCheck.valid) return nameCheck.message;

      updates.name = newValue.toUpperCase();

    } else if (field === "tanggal") {
      if (!isValidDate(newValue)) {
        return (
          `⚠️ Invalid date: *${newValue}*\n` +
          "Use format DD-MM-YYYY. Example: 21-06-2026"
        );
      }
      updates.date = newValue;

    } else if (field === "jam") {
      if (newValue.toLowerCase() === "clear") {
        // Remove time from order
        updates.time = null;
      } else if (!isValidTime(newValue)) {
        return (
          `⚠️ Invalid time: *${newValue}*\n` +
          "Use 24-hour format HH.MM. Example: 08.00 or 14.30"
        );
      } else {
        updates.time = newValue;
      }

    } else if (field === "kue") {
      if (newValue.toLowerCase() === "clear") {
        updates.cake = null;
      } else {
        const cakeCheck = validateCakeName(newValue);
        if (!cakeCheck.valid) return cakeCheck.message;
        updates.cake = newValue;
      }
    }

    const result = editOrder(target, updates);
    if (!result.success) return result.message;

    const o = result.order;
    const cakeStr = o.cake ? `\nCake: *${o.cake}*` : "";
    const timeStr = o.time ? ` at *${formatTime(o.time)}*` : "";
    return (
      `✏️ Order updated!\n` +
      `Name: *${o.name}*${cakeStr}\n` +
      `Date: ${formatDate(o.date)}${timeStr}`
    );
  }

  // ── HELP / FALLBACK ───────────────────────────────────────────────────────
  return (
    "🤖 *Available commands:*\n" +
    "`@bot add order <nama> [(<kue>)] <DD-MM-YYYY> [HH.MM]`\n" +
    "`@bot list`\n" +
    "`@bot delete <nama|nomor>`\n" +
    "`@bot edit <nama|nomor> nama <nama baru>`\n" +
    "`@bot edit <nama|nomor> tanggal <DD-MM-YYYY>`\n" +
    "`@bot edit <nama|nomor> jam <HH.MM>`\n" +
    "`@bot edit <nama|nomor> kue <kue baru>`\n" +
    "\n📌 Note: \n- Nama max 3 kata \n- Kue optional, dibungkus kurung () \n- Jam optional (24h format)"
  );
}

module.exports = { handleCommand, isBotMentioned };