const cron = require("node-cron");
const { readOrders, deleteOrder } = require("./orderService");
const { readReservations, syncReservations } = require("./reservationService");
const { wasSent, markSent } = require("./reminderTrackerService");
const { sendMessage } = require("./whatsappService");
const {
  daysUntil, formatDate, formatTime,       // order helpers (DD-MM-YYYY)
  daysUntilISO, formatDateISO,              // reservation helpers (ISO)
} = require("../utils/dateUtils");
const { formatReservationBlock } = require("../utils/formatUtils");
require("dotenv").config();

const ORDER_REMINDER_DAYS = [3, 2, 1];   // D-3, D-2, D-1
const RESERVATION_REMINDER_DAYS = [1];   // D-1 only
const REMINDER_CRON = "0 8 * * *";       // daily reminder check at 08:00
const SYNC_CRON = "*/30 * * * *";        // sync sheet every 30 minutes

// ── Formatters ────────────────────────────────────────────────────────────────

function formatOrderLine(order, index) {
  const cakeStr = order.cake ? ` (${order.cake})` : "";
  const timeStr = order.time ? ` ${formatTime(order.time)}` : "";
  return `${index}. *${order.name}*${cakeStr} — ${formatDate(order.date)}${timeStr}`;
}

/**
 * Build the full combined daily reminder message across
 * orders + reservations, grouped by H-stage.
 * @param {object} orderGroups - { 3: [...], 2: [...], 1: [...], 0: [...] }
 * @param {object} resGroups - same shape but for reservations
 * @returns {string|null}
 */
function buildCombinedMessage(orderGroups, resGroups) {
  const sections = [];
  const stages = [3, 2, 1, 0];

  for (const days of stages) {
    const orders = orderGroups[days] || [];
    const reservations = resGroups[days] || [];

    if (orders.length === 0 && reservations.length === 0) continue;

    const heading = days === 0 ? "🚨 *Today (D-Day)*" : `🔔 *H-${days}*`;
    const lines = [];

    if (orders.length > 0) {
      lines.push("_Orders:_");
      orders.forEach((o, i) => lines.push(formatOrderLine(o, i + 1)));
    }

    if (reservations.length > 0) {
      lines.push("_Reservations:_");
      reservations.forEach((r, i) => lines.push(formatReservationBlock(r, i + 1)));
    }

    sections.push(`${heading}\n${lines.join("\n")}`);
  }

  if (sections.length === 0) return null;

  return `📅 *Daily Reminder*\n\n${sections.join("\n\n")}\n\nPlease prepare 🙏`;
}

/**
 * Group orders by day-distance, skipping ones already reminded for that stage.
 */
function groupOrders() {
  const orders = readOrders();
  const grouped = {};
  const passed = [];

  for (const order of orders) {
    const days = daysUntil(order.date);

    if (ORDER_REMINDER_DAYS.includes(days) || days === 0) {
      const key = `order:${order.id}:H-${days}`;
      if (wasSent(key)) continue; // already reminded for this stage

      if (!grouped[days]) grouped[days] = [];
      grouped[days].push(order);
    } else if (days < 0) {
      passed.push(order);
    }
  }

  return { grouped, passed };
}

/**
 * Group reservations by day-distance, skipping ones already reminded.
 */
function groupReservations() {
  const reservations = readReservations();
  const grouped = {};

  for (const res of reservations) {
    const days = daysUntilISO(res.date);

    if (RESERVATION_REMINDER_DAYS.includes(days) || days === 0) {
      const key = `reservation:${res.name}:${res.date}:H-${days}`;
      if (wasSent(key)) continue;

      if (!grouped[days]) grouped[days] = [];
      grouped[days].push(res);
    }
  }

  return grouped;
}

/**
 * Mark all items in the built message as sent, so we never duplicate.
 */
function markAllSent(orderGroups, resGroups) {
  for (const days of Object.keys(orderGroups)) {
    orderGroups[days].forEach((o) => markSent(`order:${o.id}:H-${days}`));
  }
  for (const days of Object.keys(resGroups)) {
    resGroups[days].forEach((r) => markSent(`reservation:${r.name}:${r.date}:H-${days}`));
  }
}

/**
 * Main reminder check — combines orders + reservations into ONE message.
 */
async function checkAndSendReminders() {
  const target = process.env.GROUP_TARGET;
  if (!target) {
    console.error("[Reminder] GROUP_TARGET is not set in .env");
    return;
  }

  const { grouped: orderGroups, passed } = groupOrders();
  const resGroups = groupReservations();

  console.log("[Reminder] Order groups:", Object.keys(orderGroups));
  console.log("[Reminder] Reservation groups:", Object.keys(resGroups));

  const message = buildCombinedMessage(orderGroups, resGroups);

  if (message) {
    await sendMessage(target, message);
    markAllSent(orderGroups, resGroups);
  } else {
    console.log("[Reminder] Nothing to remind today.");
  }

  // Clean up passed orders (reservations are already filtered at sync time)
  for (const order of passed) {
    console.log(`[Reminder] Order "${order.name}" has passed. Removing.`);
    deleteOrder(order.name);
  }
}

/**
 * Start both schedulers: sheet sync + reminder check.
 */
function startReminderScheduler() {
  console.log(`[Reminder] Reminder cron: "${REMINDER_CRON}"`);
  console.log(`[Reminder] Sheet sync cron: "${SYNC_CRON}"`);

  // Sync reservations periodically
  cron.schedule(SYNC_CRON, async () => {
    try {
      await syncReservations();
    } catch (err) {
      console.error("[Reminder] Sheet sync failed:", err.message);
    }
  });

  // Daily reminder check
  cron.schedule(REMINDER_CRON, async () => {
    console.log("[Reminder] Running scheduled reminder check...");
    await checkAndSendReminders();
  });

  // Run an initial sync on startup so data isn't empty
  syncReservations().catch((err) =>
    console.error("[Reminder] Initial sheet sync failed:", err.message)
  );
}

module.exports = { startReminderScheduler, checkAndSendReminders };