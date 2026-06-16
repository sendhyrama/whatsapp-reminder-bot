const fs = require("fs");
const path = require("path");

// Absolute path to our JSON "database"
const DATA_FILE = path.join(__dirname, "../../data/orders.json");

/**
 * Read all orders from the JSON file.
 * @returns {Array} list of order objects
 */
function readOrders() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    // If file doesn't exist or is malformed, return empty array
    return [];
  }
}

/**
 * Write the full orders array back to the JSON file.
 * @param {Array} orders
 */
function writeOrders(orders) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(orders, null, 2), "utf-8");
}

/**
 * Add a new order. Returns an error string if validation fails.
 * @param {string} name - Order name (must be unique)
 * @param {string} date - YYYY-MM-DD
 * @returns {{ success: boolean, message: string }}
 */
function addOrder(name, date) {
  const orders = readOrders();

  // Prevent duplicate order names (case-insensitive)
  const duplicate = orders.find(
    (o) => o.name.toLowerCase() === name.toLowerCase()
  );
  if (duplicate) {
    return { success: false, message: `❌ Order *${name}* already exists.` };
  }

  const newOrder = {
    id: Date.now(), // simple unique ID
    name,
    date,
    createdAt: new Date().toISOString(),
  };

  orders.push(newOrder);
  writeOrders(orders);

  return { success: true, message: `✅ Order *${name}* saved for ${date}.` };
}

/**
 * Delete an order by name.
 * @param {string} name
 * @returns {{ success: boolean, message: string }}
 */
function deleteOrder(name) {
  const orders = readOrders();
  const index = orders.findIndex(
    (o) => o.name.toLowerCase() === name.toLowerCase()
  );

  if (index === -1) {
    return { success: false, message: `❌ Order *${name}* not found.` };
  }

  orders.splice(index, 1);
  writeOrders(orders);

  return { success: true, message: `🗑️ Order *${name}* has been deleted.` };
}

/**
 * List all orders.
 * @returns {Array}
 */
function listOrders() {
  return readOrders();
}

module.exports = { addOrder, deleteOrder, listOrders, readOrders };