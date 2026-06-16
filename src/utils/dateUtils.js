const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");

dayjs.extend(customParseFormat);

/**
 * Validate that a date string is in YYYY-MM-DD format and is a real date.
 * @param {string} dateStr
 * @returns {boolean}
 */
function isValidDate(dateStr) {
  return dayjs(dateStr, "YYYY-MM-DD", true).isValid();
}

/**
 * Format a date string to a human-readable format.
 * e.g. "2026-06-20" → "20 June 2026"
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {string}
 */
function formatDate(dateStr) {
  return dayjs(dateStr).format("D MMMM YYYY");
}

/**
 * Calculate how many days until the given date (from today).
 * Returns a negative number if the date has passed.
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {number}
 */
function daysUntil(dateStr) {
  const today = dayjs().startOf("day");
  const target = dayjs(dateStr).startOf("day");
  return target.diff(today, "day");
}

module.exports = { isValidDate, formatDate, daysUntil };