const fs = require("fs");
const path = require("path");

const TRACKER_FILE = path.join(__dirname, "../../data/sentReminders.json");

function readSentKeys() {
  try {
    const raw = fs.readFileSync(TRACKER_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeSentKeys(keys) {
  fs.writeFileSync(TRACKER_FILE, JSON.stringify(keys, null, 2), "utf-8");
}

/**
 * Check if a reminder for this key was already sent.
 * @param {string} key - unique identifier, e.g. "order:123:H-3"
 * @returns {boolean}
 */
function wasSent(key) {
  const keys = readSentKeys();
  return keys.includes(key);
}

/**
 * Mark a reminder key as sent.
 * @param {string} key
 */
function markSent(key) {
  const keys = readSentKeys();
  if (!keys.includes(key)) {
    keys.push(key);
    writeSentKeys(keys);
  }
}

module.exports = { wasSent, markSent };