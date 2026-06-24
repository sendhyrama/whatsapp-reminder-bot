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
    const lines = [`${index}.⁠ ⁠*${res.name}* | ${timeRange}`];
    lines.push(`•⁠  ⁠Area: ${val(res.area)}`);
    lines.push(`•⁠  ⁠Paket: ${val(res.paket)}`);
    lines.push(`•⁠  ⁠Table Decor: ${val(res.tableDecor)}`);
    lines.push(`•⁠  ⁠Req Tulisan: ${val(res.reqTulisan)}`);
    lines.push(`•⁠  ⁠Add on: ${val(res.addOn)}`);
    lines.push(`•⁠  ⁠Pembayaran: ${val(res.statusPembayaran)}`);
    lines.push(`•⁠  ⁠Note: ${val(res.note)}`);
  
    return lines.join("\n");
  }
  
  module.exports = { formatReservationBlock };