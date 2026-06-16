const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "../../data/orders.json");

function readOrders() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeOrders(orders) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(orders, null, 2), "utf-8");
}

/**
 * Add a new order.
 * @param {string} name
 * @param {string} date - DD-MM-YYYY
 * @param {string|null} time - HH.MM (optional)
 */
function addOrder(name, date, time = null) {
  const orders = readOrders();

  const duplicate = orders.find(
    (o) => o.name.toLowerCase() === name.toLowerCase()
  );
  if (duplicate) {
    return { success: false, message: `❌ Order *${name}* already exists.` };
  }

  const newOrder = {
    id: Date.now(),
    name,
    date,      // DD-MM-YYYY
    time,      // HH.MM or null
    createdAt: new Date().toISOString(),
  };

  orders.push(newOrder);
  writeOrders(orders);

  return { success: true, message: null, order: newOrder };
}

/**
 * Delete by name OR by list number (1-based index).
 * @param {string} nameOrNumber
 */
function deleteOrder(nameOrNumber) {
  const orders = readOrders();

  let index = -1;

  // Check if input is a number
  const num = parseInt(nameOrNumber, 10);
  if (!isNaN(num)) {
    // 1-based index
    index = num - 1;
    if (index < 0 || index >= orders.length) {
      return { success: false, message: `❌ No order at number *${num}*.` };
    }
  } else {
    // Find by name
    index = orders.findIndex(
      (o) => o.name.toLowerCase() === nameOrNumber.toLowerCase()
    );
    if (index === -1) {
      return { success: false, message: `❌ Order *${nameOrNumber}* not found.` };
    }
  }

  const deleted = orders[index];
  orders.splice(index, 1);
  writeOrders(orders);

  return { success: true, message: null, order: deleted };
}

/**
 * Edit an existing order by name or list number.
 * Only updates the fields that are provided.
 * @param {string} nameOrNumber
 * @param {object} updates - { name?, date?, time? }
 */
function editOrder(nameOrNumber, updates) {
  const orders = readOrders();

  let index = -1;

  const num = parseInt(nameOrNumber, 10);
  if (!isNaN(num)) {
    index = num - 1;
    if (index < 0 || index >= orders.length) {
      return { success: false, message: `❌ No order at number *${num}*.` };
    }
  } else {
    index = orders.findIndex(
      (o) => o.name.toLowerCase() === nameOrNumber.toLowerCase()
    );
    if (index === -1) {
      return { success: false, message: `❌ Order *${nameOrNumber}* not found.` };
    }
  }

  // Check for duplicate name if name is being changed
  if (updates.name) {
    const duplicate = orders.find(
      (o, i) => i !== index && o.name.toLowerCase() === updates.name.toLowerCase()
    );
    if (duplicate) {
      return { success: false, message: `❌ Order name *${updates.name}* already exists.` };
    }
  }

  // Apply updates
  if (updates.name) orders[index].name = updates.name.toUpperCase();
  if (updates.date) orders[index].date = updates.date;
  if (updates.hasOwnProperty("time")) orders[index].time = updates.time;

  orders[index].updatedAt = new Date().toISOString();

  writeOrders(orders);

  return { success: true, message: null, order: orders[index] };
}

function listOrders() {
  return readOrders();
}

module.exports = { addOrder, deleteOrder, editOrder, listOrders, readOrders };