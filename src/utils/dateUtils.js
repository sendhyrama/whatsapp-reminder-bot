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

/**
 * Parse a sheet date "M/D/YYYY" (e.g. "6/26/2026") into ISO format YYYY-MM-DD.
 * Handles single or double digit month/day.
 * @param {string} sheetDate - e.g. "6/26/2026"
 * @returns {string|null} - "2026-06-26" or null if invalid
 */
function parseSheetDate(sheetDate) {
  if (!sheetDate) return null;

  const parsed = dayjs(sheetDate.trim(), "M/D/YYYY", false); // non-strict: allows 6 or 06

  if (!parsed.isValid()) {
    console.warn(`[dateUtils] Invalid sheet date: "${sheetDate}"`);
    return null;
  }

  return parsed.format("YYYY-MM-DD");
}

/**
 * Extract start time from a range string like "15.30 - 17.30" → "15:30".
 * Robust to extra spaces or different dash characters.
 * @param {string} waktu - e.g. "15.30 - 17.30"
 * @returns {string|null} - "15:30" or null if invalid
 */
function parseSheetTime(waktu) {
  if (!waktu) return null;

  // Split on common dash variants: -, –, —
  const parts = waktu.split(/[-–—]/);
  if (parts.length === 0) return null;

  const start = parts[0].trim(); // e.g. "15.30"

  // Validate format X.XX or XX.XX
  const match = start.match(/^(\d{1,2})\.(\d{2})$/);
  if (!match) {
    console.warn(`[dateUtils] Invalid time format: "${waktu}"`);
    return null;
  }

  const hour = match[1].padStart(2, "0");
  const minute = match[2];

  return `${hour}:${minute}`;
}

/**
 * Format an ISO date (YYYY-MM-DD) into human-readable form.
 * e.g. "2026-06-26" → "26 June 2026"
 * Separate from formatDate() which expects DD-MM-YYYY (used by orders).
 * @param {string} isoDate - YYYY-MM-DD
 * @returns {string}
 */
function formatDateISO(isoDate) {
  return dayjs(isoDate, "YYYY-MM-DD").format("D MMMM YYYY");
}

/**
 * Calculate days until an ISO date (YYYY-MM-DD) from today.
 * Separate from daysUntil() which expects DD-MM-YYYY (used by orders).
 * @param {string} isoDate - YYYY-MM-DD
 * @returns {number}
 */
function daysUntilISO(isoDate) {
  const today = dayjs().startOf("day");
  const target = dayjs(isoDate, "YYYY-MM-DD").startOf("day");
  return target.diff(today, "day");
}

module.exports = { isValidDate, isValidTime, formatDate, formatTime, daysUntil, toSortable,
  parseSheetDate, parseSheetTime, formatDateISO, daysUntilISO,
};