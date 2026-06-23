const fs = require("fs");
const path = require("path");
const axios = require("axios");
const Papa = require("papaparse");
const { parseSheetDate, parseSheetTime, daysUntilISO } = require("../utils/dateUtils");
require("dotenv").config();

const CACHE_FILE = path.join(__dirname, "../../data/reservations.json");

/**
 * Fetch raw CSV text from the public Google Sheets URL.
 * @returns {Promise<string>}
 */
async function fetchCSV() {
  const url = process.env.RESERVATION_SHEET_CSV_URL;

  if (!url) {
    throw new Error("RESERVATION_SHEET_CSV_URL is not set in .env");
  }

  const response = await axios.get(url, { responseType: "text" });
  return response.data;
}

/**
 * Parse raw CSV text into an array of row objects using sheet headers.
 * @param {string} csvText
 * @returns {Array<object>}
 */
function parseCSV(csvText) {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  return result.data;
}

/**
 * Normalize a raw sheet row into our internal reservation format.
 * Skips rows with invalid/missing date.
 * @param {object} row - { Nama, Tanggal, Waktu, Area }
 * @returns {object|null}
 */
function normalizeRow(row) {
  const name = (row["Nama"] || "").trim();
  const date = parseSheetDate(row["Tanggal"]);
  const time = parseSheetTime(row["Waktu"]);
  const area = (row["Area"] || "").trim();
  const tableDecor = (row["Table Decor"] || "").trim();
  const paket = (row["Paket"] || "").trim();
  const addOn = (row["Add On"] || "").trim();
  const reqTulisan = (row["Req Tulisan"] || "").trim();
  const statusPembayaran = (row["Status Pembayaran"] || "").trim();
  const note = (row["Note"] || "").trim();

  if (!name || !date) {
    console.warn("[Reservation] Skipping invalid row:", row);
    return null;
  }

  return {
    name,
    date,
    time,
    area,
    tableDecor,
    paket,
    addOn,
    reqTulisan,
    statusPembayaran,
    note,
    type: "reservation",
  };
}

/**
 * Fetch, parse, normalize, and filter to FUTURE reservations only.
 * Writes result to local cache file.
 * @returns {Promise<Array<object>>}
 */
async function syncReservations() {
  console.log("[Reservation] Syncing from Google Sheets...");

  const csvText = await fetchCSV();
  const rows = parseCSV(csvText);

  const normalized = rows
    .map(normalizeRow)
    .filter((r) => r !== null);

  // Keep only future or today's reservations (days >= 0)
  const future = normalized.filter((r) => daysUntilISO(r.date) >= 0);

  fs.writeFileSync(CACHE_FILE, JSON.stringify(future, null, 2), "utf-8");

  console.log(`[Reservation] Synced ${future.length} future reservation(s) (${normalized.length - future.length} past row(s) filtered out).`);

  return future;
}

/**
 * Read reservations from local cache (does not hit Google Sheets).
 * @returns {Array<object>}
 */
function readReservations() {
  try {
    const raw = fs.readFileSync(CACHE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

module.exports = { syncReservations, readReservations };