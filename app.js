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
  // Acknowledge immediately — Fonnte expects a fast 200 response
  res.sendStatus(200);

  const body = req.body;

  // Log incoming payload for debugging
  console.log("[Webhook] Incoming:", JSON.stringify(body, null, 2));

  // Fonnte payload fields:
  // body.message  — the message text
  // body.sender   — sender's WhatsApp number
  // body.device   — your device number (the bot's number)
  const message = body.message || body.text || "";
  const sender  = body.sender || "";

  if (!message) {
    console.log("[Webhook] Empty message received. Skipping.");
    return;
  }

  // Process the command and get a reply
  const reply = handleCommand(message, sender);

  if (reply) {
    // Send reply to the group (or back to sender if you want personal reply)
    const target = process.env.GROUP_TARGET;
    await sendMessage(target, reply);
  }
});

// ── Start server and scheduler ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[Server] Bot running on http://localhost:${PORT}`);
  console.log(`[Server] Webhook endpoint: http://localhost:${PORT}/webhook`);
  startReminderScheduler();
});