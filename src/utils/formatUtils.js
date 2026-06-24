const { formatDate } = require("./dateUtils");

/**
 * Format an order as a list line for WhatsApp.
 * @param {object} order
 * @param {number} index - 1-based
 * @returns {string}
 */
function formatOrderLine(order, index) {
  const dateTimeStr = order.time ? `${formatDate(order.date)} ${order.time}` : formatDate(order.date);
  const lines = [`${index}. *${order.name}* | ${dateTimeStr}`];
  
  if (order.cake) {
    lines.push(`•⁠  ${order.cake}`);
  }
  
  return lines.join("\n");
}

/**
 * Format a reservation as a bullet-point detail block for WhatsApp.
 * Empty fields show as "-" instead of being skipped.
 * @param {object} res
 * @param {number} index - 1-based
 * @returns {string}
 */
function formatReservationBlock(res, index) {
    const val = (v) => (v && v.trim() ? v : "-");
    const timeRange = val(res.timeRange);
    
    const lines = [
      `${index}.⁠ ⁠*${res.name}* | ${timeRange}`,
      `•⁠  ⁠Area: ${val(res.area)}`,
      `•⁠  ⁠Paket: ${val(res.paket)}`,
      `•⁠  ⁠Table Decor: ${val(res.tableDecor)}`,
      `•⁠  ⁠Req Tulisan: ${val(res.reqTulisan)}`,
      `•⁠  ⁠Add on: ${val(res.addOn)}`,
      `•⁠  ⁠Pembayaran: ${val(res.statusPembayaran)}`,
      `•⁠  ⁠Note: ${val(res.note)}`
    ];
  
    return lines.join("\n");
  }
  
  module.exports = { formatOrderLine, formatReservationBlock };