const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");

dayjs.extend(customParseFormat);

/**
 * Validate DD-MM-YYYY format.
 * @param {string} dateStr
 * @returns {boolean}
 */
function isValidDate(dateStr) {
  return dayjs(dateStr, "DD-MM-YYYY", true).isValid();
}

/**
 * Validate HH.MM time format (24h).
 * @param {string} timeStr
 * @returns {boolean}
 */
function isValidTime(timeStr) {
  if (!timeStr) return false;
  const regex = /^([01]\d|2[0-3])\.([0-5]\d)$/;
  return regex.test(timeStr);
}

/**
 * Format DD-MM-YYYY to human-readable.
 * e.g. "21-06-2026" → "21 June 2026"
 * @param {string} dateStr - DD-MM-YYYY
 * @returns {string}
 */
function formatDate(dateStr) {
  return dayjs(dateStr, "DD-MM-YYYY").format("D MMMM YYYY");
}

/**
 * Format HH.MM to HH:MM for display.
 * e.g. "08.00" → "08:00"
 * @param {string} timeStr
 * @returns {string}
 */
function formatTime(timeStr) {
  if (!timeStr) return null;
  return timeStr.replace(".", ":");
}

/**
 * Calculate days until a DD-MM-YYYY date from today.
 * @param {string} dateStr - DD-MM-YYYY
 * @returns {number}
 */
function daysUntil(dateStr) {
  const today = dayjs().startOf("day");
  const target = dayjs(dateStr, "DD-MM-YYYY").startOf("day");
  return target.diff(today, "day");
}

/**
 * Convert DD-MM-YYYY to YYYY-MM-DD for internal sorting.
 * @param {string} dateStr - DD-MM-YYYY
 * @returns {string}
 */
function toSortable(dateStr) {
  return dayjs(dateStr, "DD-MM-YYYY").format("YYYY-MM-DD");
}

module.exports = { isValidDate, isValidTime, formatDate, formatTime, daysUntil, toSortable };