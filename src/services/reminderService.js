const cron = require("node-cron");
const { readOrders, deleteOrder } = require("./orderService");
const { sendMessage } = require("./whatsappService");
const { daysUntil, formatDate } = require("../utils/dateUtils");
require("dotenv").config();

/**
 * Build the reminder message string.
 * @param {string} hLabel - e.g. "H-3"
 * @param {object} order  - order object { name, date }
 * @returns {string}
 */
function buildReminderMessage(hLabel, order) {
  const { formatDate, formatTime } = require("../utils/dateUtils");
  const timeStr = order.time ? `\nTime: *${formatTime(order.time)}*` : "";
  
  return (
    `🔔 *Reminder ${hLabel}*\n` +
    `Order: *${order.name}*\n` +
    `Date: ${formatDate(order.date)}${timeStr}\n` +
    `Please prepare 🙏`
  );
}

/**
 * Check all orders and send reminders for H-3, H-2, H-1.
 * Also removes orders that have already passed (H-0 or earlier).
 */
async function checkAndSendReminders() {
  const orders = readOrders();
  const target = process.env.GROUP_TARGET;

  if (!target) {
    console.error("[Reminder] GROUP_TARGET is not set in .env");
    return;
  }

  console.log(`[Reminder] Checking ${orders.length} order(s)...`);

  for (const order of orders) {
    const days = daysUntil(order.date);

    console.log(`[Reminder] Order "${order.name}" → ${days} day(s) until ${order.date}`);

    if (days === 3) {
      await sendMessage(target, buildReminderMessage("H-3", order));
    } else if (days === 2) {
      await sendMessage(target, buildReminderMessage("H-2", order));
    } else if (days === 1) {
      await sendMessage(target, buildReminderMessage("H-1", order));
    } else if (days === 0) {
      // Day of the order — send a final reminder
      await sendMessage(
        target,
        `🚨 *Today is the order day!*\nOrder: *${order.name}*\nDate: ${formatDate(order.date)}`
      );
    } else if (days < 0) {
      // Order has passed — clean it up automatically
      console.log(`[Reminder] Order "${order.name}" has passed. Removing.`);
      deleteOrder(order.name);
    }
  }
}

/**
 * Start the reminder scheduler.
 * Runs every day at 08:00 AM local time.
 */
function startReminderScheduler() {
  console.log("[Reminder] Scheduler started — will check daily at 08:00 AM.");

  // Cron: second minute hour day month weekday
  cron.schedule("0 8 * * *", async () => {
    console.log("[Reminder] Running daily reminder check...");
    await checkAndSendReminders();
  });
}

module.exports = { startReminderScheduler, checkAndSendReminders };