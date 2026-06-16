require("dotenv").config();
const express = require("express");
const { handleCommand } = require("./src/handlers/commandHandler");
const { sendMessage } = require("./src/services/whatsappService");
const { startReminderScheduler } = require("./src/services/reminderService");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Fonnte may send form-encoded data

// ── Health check endpoint ──────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "WhatsApp Reminder Bot is running." });
});

// ── Webhook endpoint ───────────────────────────────────────────────────────────
// Fonnte will POST to this URL every time a message arrives.
app.post("/webhook", async (req, res) => {
  res.sendStatus(200);

  const body = req.body;
  console.log("[Webhook] Incoming:", JSON.stringify(body, null, 2));

  // ── Extract correct fields from Fonnte payload ───────────────────────────
  const message   = body.message || "";        // the text typed
  const sender    = body.member  || "";        // person who typed (real sender)
  const groupId   = body.pengirim || body.sender || ""; // group ID
  const isGroup   = body.isgroup || false;
  const botNumber = body.device  || "";        // your bot's own number

  if (!message) {
    console.log("[Webhook] Empty message. Skipping.");
    return;
  }

  // ── Only respond to group messages ───────────────────────────────────────
  if (!isGroup) {
    console.log("[Webhook] Not a group message. Skipping.");
    return;
  }

  // ── Ignore messages sent by the bot itself ───────────────────────────────
  if (sender === botNumber) {
    console.log("[Webhook] Ignoring own message.");
    return;
  }

  console.log(`[Webhook] From: ${sender} | Group: ${groupId} | Message: "${message}"`);

  // ── Process command ──────────────────────────────────────────────────────
  const reply = handleCommand(message, sender);

  if (reply) {
    // Send reply to the group using the group ID from the payload
    const target = groupId || process.env.GROUP_TARGET;
    await sendMessage(target, reply);
  }
});

// ── Start server and scheduler ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[Server] Bot running on http://localhost:${PORT}`);
  console.log(`[Server] Webhook endpoint: http://localhost:${PORT}/webhook`);
  startReminderScheduler();
});