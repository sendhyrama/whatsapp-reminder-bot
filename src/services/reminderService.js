const cron = require("node-cron");
const { readOrders, deleteOrder } = require("./orderService");
const { sendMessage } = require("./whatsappService");
const { daysUntil, formatDate, formatTime } = require("../utils/dateUtils");
require("dotenv").config();

// ── CONFIG: Which days before the order date to send reminders ───────────────
const REMINDER_DAYS = [3, 2, 1];

// ── CONFIG: What time of day the cron job runs ────────────────────────────────
const CRON_SCHEDULE = "0 8 * * *";

/**
 * Format a single order line for use inside a reminder section.
 * @param {object} order
 * @param {number} index - 1-based
 * @returns {string}
 */
function formatOrderLine(order, index) {
  const cakeStr = order.cake ? ` (${order.cake})` : "";
  const timeStr = order.time ? ` ${formatTime(order.time)}` : "";
  return `${index}. *${order.name}*${cakeStr} — ${formatDate(order.date)}${timeStr}`;
}

/**
 * Build ONE combined reminder message containing all stages
 * (H-3, H-2, H-1, D-Day) that currently have matching orders.
 * Stages with no orders are skipped entirely.
 *
 * @param {object} grouped - { 3: [...orders], 2: [...], 1: [...], 0: [...] }
 * @returns {string|null} - null if there's nothing to send
 */
function buildCombinedReminderMessage(grouped) {
  const sections = [];

  // Sort descending: H-3 → H-2 → H-1 → D-Day(0)
  const stages = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => b - a);

  for (const days of stages) {
    const orders = grouped[days];
    if (!orders || orders.length === 0) continue;

    const lines = orders.map((o, i) => formatOrderLine(o, i + 1));
    const heading = days === 0 ? "🚨 *Today (D-Day)*" : `🔔 *H-${days}*`;

    sections.push(`${heading}\n${lines.join("\n")}`);
  }

  // Nothing to remind about today
  if (sections.length === 0) return null;

  return (
    `📅 *Daily Order Reminder*\n\n` +
    sections.join("\n\n") +
    `\n\nTolong disiapin ya 🙏`
  );
}

/**
 * Check all orders, group them by reminder stage,
 * and send ONE combined message containing all stages.
 * Also removes orders that have already passed.
 */
async function checkAndSendReminders() {
  const orders = readOrders();
  const target = process.env.GROUP_TARGET;

  if (!target) {
    console.error("[Reminder] GROUP_TARGET is not set in .env");
    return;
  }

  console.log(`[Reminder] Checking ${orders.length} order(s)...`);

  // ── Group orders by their day-distance (e.g. { 3: [...], 1: [...] }) ───────
  const grouped = {};
  const passedOrders = [];

  for (const order of orders) {
    const days = daysUntil(order.date);
    console.log(`[Reminder] Order "${order.name}" → ${days} day(s) until ${order.date}`);

    if (REMINDER_DAYS.includes(days) || days === 0) {
      if (!grouped[days]) grouped[days] = [];
      grouped[days].push(order);
    } else if (days < 0) {
      passedOrders.push(order);
    }
  }

  // ── Send ONE combined message for all stages ─────────────────────────────────
  const message = buildCombinedReminderMessage(grouped);

  if (message) {
    await sendMessage(target, message);
  } else {
    console.log("[Reminder] No reminders to send today.");
  }

  // ── Clean up passed orders ───────────────────────────────────────────────────
  for (const order of passedOrders) {
    console.log(`[Reminder] Order "${order.name}" has passed. Removing.`);
    deleteOrder(order.name);
  }
}

/**
 * Start the reminder scheduler using CRON_SCHEDULE config above.
 */
function startReminderScheduler() {
  console.log(`[Reminder] Scheduler started — cron: "${CRON_SCHEDULE}"`);

  cron.schedule(CRON_SCHEDULE, async () => {
    console.log("[Reminder] Running scheduled reminder check...");
    await checkAndSendReminders();
  });
}

module.exports = { startReminderScheduler, checkAndSendReminders };