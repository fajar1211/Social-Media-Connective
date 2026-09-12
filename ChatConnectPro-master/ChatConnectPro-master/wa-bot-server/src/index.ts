import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import statusRoutes from "./routes/status.js";
import chatsRoutes from "./routes/chats.js";
import analyticsRoutes from "./routes/analytics.js";
import knowledgeRoutes from "./routes/knowledge.js";
import importRoutes from "./routes/import.js";
import instagramRoutes from "./routes/instagram.js";
import messengerRoutes from "./routes/messenger.js";
import { authMiddleware, getAuthedClient } from "./middleware/auth.js";
import { getBotStatus, getSocket } from "./whatsapp.js";
import { botManager } from "./bot-manager.js";
import { runMigration } from "./migrate.js";
import { supabase } from "./supabase.js";
import { InstagramClient } from "./instagram.js";
import { MessengerClient } from "./messenger.js";
import monitoringRoutes from "./routes/monitoring.js";
import { rateLimit } from "./middleware/rate-limit.js";
import { startScheduler } from "./scheduler.js";
import pino from "pino";

process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});

// ─── Environment validation ──────────────────────────
const REQUIRED_ENV = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;
const missing: string[] = [];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) missing.push(key);
}
if (missing.length > 0) {
  console.error(`❌ Missing required environment variables: ${missing.join(", ")}`);
  console.error("   Lihat .env.example untuk referensi");
  process.exit(1);
}
if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
  console.warn("⚠️  Neither GEMINI_API_KEY nor GROQ_API_KEY set — AI replies will be disabled");
}

// ─── Persistent logging ─────────────────────────────
const LOG_DIR = process.env.LOG_DIR || "logs";
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    targets: [
      { target: "pino-pretty", options: { colorize: true }, level: "info" },
      { target: "pino/file", options: { destination: path.join(LOG_DIR, "app.log") }, level: "info" },
      { target: "pino/file", options: { destination: path.join(LOG_DIR, "error.log") }, level: "error" },
    ],
  },
});

// Replace console.log with pino
console.log = (...args) => logger.info(args.map(String).join(" "));
console.error = (...args) => logger.error(args.map(String).join(" "));
console.warn = (...args) => logger.warn(args.map(String).join(" "));

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Fase 10: Rate limiting — 100 request/menit per IP
app.use("/api/", rateLimit(100, 60_000));

// Routes publik (tanpa auth) — backward compatibility
app.use(statusRoutes);
app.use(chatsRoutes);

// Instagram Webhook (public — verified via token)
app.get("/webhook/instagram", async (req, res) => {
  const mode = req.query["hub.mode"] as string;
  const token = req.query["hub.verify_token"] as string;
  const challenge = req.query["hub.challenge"] as string;

  if (!mode || !token || !challenge) {
    res.status(400).send("Missing parameters");
    return;
  }

  try {
    // Cari instance Instagram yang verify_token-nya cocok
    const { data: instances } = await supabase
      .from("bot_instances")
      .select("credentials")
      .eq("platform", "instagram");

    for (const inst of instances || []) {
      const creds = inst.credentials as any;
      if (creds?.verify_token === token) {
        console.log("[Instagram] Webhook verified via token");
        res.status(200).send(challenge);
        return;
      }
    }

    console.warn("[Instagram] Webhook verify failed — no matching token");
    res.status(403).send("Token mismatch");
  } catch (err) {
    console.error("[Instagram] Webhook verify error:", err);
    res.status(500).send("Error");
  }
});

app.post("/webhook/instagram", async (req, res) => {
  try {
    const entry = req.body?.entry?.[0];
    if (!entry) {
      res.status(400).send("Invalid payload");
      return;
    }

    const pageId = entry.id;
    if (!pageId) {
      res.status(400).send("Missing page ID");
      return;
    }

    // Cari instance berdasarkan page_id di credentials
    const { data: instances } = await supabase
      .from("bot_instances")
      .select("*")
      .eq("platform", "instagram");

    let matched: any = null;
    for (const inst of instances || []) {
      const creds = inst.credentials as any;
      if (creds?.page_id === pageId) {
        matched = inst;
        break;
      }
    }

    if (!matched) {
      console.warn(`[Instagram] No instance found for page ${pageId}`);
      res.status(200).send("ECHO"); // Always 200 to acknowledge
      return;
    }

    const creds = matched.credentials as any;
    const client = new InstagramClient(creds.page_id, creds.access_token, creds.ig_user_id);
    await client.handleWebhook(req.body);

    res.status(200).send("ECHO");
  } catch (err) {
    console.error("[Instagram] Webhook POST error:", err);
    res.status(200).send("ECHO");
  }
});

// Messenger Webhook (public — verified via token)
app.get("/webhook/messenger", async (req, res) => {
  const mode = req.query["hub.mode"] as string;
  const token = req.query["hub.verify_token"] as string;
  const challenge = req.query["hub.challenge"] as string;

  if (!mode || !token || !challenge) {
    res.status(400).send("Missing parameters");
    return;
  }

  try {
    const { data: instances } = await supabase
      .from("bot_instances")
      .select("credentials")
      .eq("platform", "messenger");

    for (const inst of instances || []) {
      const creds = inst.credentials as any;
      if (creds?.verify_token === token) {
        console.log("[Messenger] Webhook verified via token");
        res.status(200).send(challenge);
        return;
      }
    }

    console.warn("[Messenger] Webhook verify failed — no matching token");
    res.status(403).send("Token mismatch");
  } catch (err) {
    console.error("[Messenger] Webhook verify error:", err);
    res.status(500).send("Error");
  }
});

app.post("/webhook/messenger", async (req, res) => {
  try {
    const body = req.body;
    if (body.object !== "page") {
      res.status(400).send("Invalid object");
      return;
    }

    const pageId = body.entry?.[0]?.id;
    if (!pageId) {
      res.status(400).send("Missing page ID");
      return;
    }

    const { data: instances } = await supabase
      .from("bot_instances")
      .select("*")
      .eq("platform", "messenger");

    let matched: any = null;
    for (const inst of instances || []) {
      const creds = inst.credentials as any;
      if (creds?.page_id === pageId) {
        matched = inst;
        break;
      }
    }

    if (!matched) {
      console.warn(`[Messenger] No instance found for page ${pageId}`);
      res.status(200).send("ECHO");
      return;
    }

    const creds = matched.credentials as any;
    const client = new MessengerClient(creds.page_id, creds.access_token, creds.app_secret);
    await client.handleWebhook(body);

    res.status(200).send("ECHO");
  } catch (err) {
    console.error("[Messenger] Webhook POST error:", err);
    res.status(200).send("ECHO");
  }
});

// Routes analytics — dilindungi auth
app.use(analyticsRoutes);

// Routes knowledge — dilindungi auth (per-user)
app.use("/api/knowledge", authMiddleware);
app.use(knowledgeRoutes);
app.use(importRoutes);

// Routes Instagram & Messenger channel management — dilindungi auth
app.use(instagramRoutes);
app.use(messengerRoutes);

// Fase 9: Routes baru — dilindungi auth
import autoReplyRoutes from "./routes/auto-reply.js";
import templateRoutes from "./routes/templates.js";
import scheduledRoutes from "./routes/scheduled.js";
import broadcastRoutes from "./routes/broadcast.js";
import adminUserRoutes from "./routes/admin-users.js";
import profileRoutes from "./routes/profile.js";
import adminRoutes from "./routes/admin.js";
app.use(autoReplyRoutes);
app.use(templateRoutes);
app.use(scheduledRoutes);
app.use(broadcastRoutes);
app.use(adminUserRoutes);
app.use(profileRoutes);
app.use(adminRoutes);

// Fase 10: Monitoring — health + metrics (dilindungi auth)
app.use(monitoringRoutes);

// Routes protected (multi-instance) — /api/bot/* dilindungi auth
import { Router } from "express";

const botRouter = Router();
botRouter.use(authMiddleware);

// GET /api/bot/instances — daftar instance milik user
botRouter.get("/instances", async (req, res) => {
  try {
    const sb = getAuthedClient(req.userToken!);
    const { data, error } = await sb
      .from("bot_instances")
      .select("*")
      .eq("user_id", req.userId!)
      .order("created_at", { ascending: true });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    const instances = data || [];

    // Override DB status with real-time bot-manager state
    const legacyStatus = getBotStatus();
    let autoAssociated = false;
    for (const inst of instances) {
      const bs = botManager.getStatus(inst.instance_id);
      if (bs.bot !== "stopped") {
        inst.status = bs.bot;
        if (bs.phone) inst.phone = bs.phone;
      } else if (!autoAssociated && legacyStatus.bot === "connected" && inst.status !== "connected") {
        autoAssociated = true;
        const legacySock = getSocket();
        botManager.registerLegacyInstance(inst.instance_id, legacySock, legacyStatus.phone, inst.user_id);
        await sb
          .from("bot_instances")
          .update({ status: "connected", phone: legacyStatus.phone })
          .eq("instance_id", inst.instance_id);
        inst.status = "connected";
        inst.phone = legacyStatus.phone;
      }
    }

    res.json(instances);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bot/create — buat instance baru
botRouter.post("/create", async (req, res) => {
  try {
    const instanceId = crypto.randomUUID();
    const sb = getAuthedClient(req.userToken!);
    const { error } = await sb.from("bot_instances").insert({
      user_id: req.userId!,
      instance_id: instanceId,
      status: "disconnected",
    });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    botManager.createInstance(instanceId, req.userId);

    res.json({ instanceId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Middleware: validasi instanceId milik user
async function validateInstanceOwnership(req: express.Request, res: express.Response, next: express.NextFunction) {
  const { instanceId } = req.params;
  if (!instanceId) {
    res.status(400).json({ error: "instanceId required" });
    return;
  }

  try {
    const sb = getAuthedClient(req.userToken!);
    const { data, error } = await sb
      .from("bot_instances")
      .select("instance_id")
      .eq("instance_id", instanceId)
      .eq("user_id", req.userId!)
      .single();

    if (error || !data) {
      res.status(404).json({ error: "Instance not found or access denied" });
      return;
    }
    next();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

botRouter.use("/:instanceId", validateInstanceOwnership);

// GET /api/bot/:instanceId — status instance
botRouter.get("/:instanceId", (req, res) => {
  const status = botManager.getStatus(req.params.instanceId);
  res.json({ status: "ok", ...status });
});

// GET /api/bot/:instanceId/qr — QR code
botRouter.get("/:instanceId/qr", (req, res) => {
  const status = botManager.getStatus(req.params.instanceId);
  if (status.qr) {
    res.json({ qr: status.qr });
  } else {
    res.json({ qr: null, message: "Tidak ada QR. Bot mungkin sudah terhubung atau belum diinisialisasi." });
  }
});

// POST /api/bot/:instanceId/restart
botRouter.post("/:instanceId/restart", async (req, res) => {
  try {
    // Pastikan instance terdaftar di BotManager (in-memory) — jika server restart,
    // Map in-memory hilang tapi data di DB masih ada
    botManager.createInstance(req.params.instanceId, req.userId);

    const existingStatus = botManager.getStatus(req.params.instanceId);
    if (existingStatus.bot === "connected" || existingStatus.bot === "initializing") {
      botManager.stopInstance(req.params.instanceId);
      await new Promise((r) => setTimeout(r, 1000));
    }

    await botManager.startInstance(req.params.instanceId);
    res.json({ success: true, message: "Instance sedang diinisialisasi. Silakan scan QR." });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/bot/:instanceId/pause — jeda bot tanpa putus socket
botRouter.post("/:instanceId/pause", async (req, res) => {
  try {
    const { instanceId } = req.params;
    botManager.pauseInstance(instanceId);
    const sb = getAuthedClient(req.userToken!);
    await sb
      .from("bot_instances")
      .update({ status: "paused" })
      .eq("instance_id", instanceId);
    res.json({ success: true, message: "Bot dijeda." });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/bot/:instanceId/resume — lanjutkan bot (atau start ulang jika socket mati)
botRouter.post("/:instanceId/resume", async (req, res) => {
  try {
    const { instanceId } = req.params;
    const status = botManager.getStatus(instanceId);
    const sb = getAuthedClient(req.userToken!);

    if (status.bot === "stopped") {
      botManager.createInstance(instanceId, req.userId);
      await botManager.startInstance(instanceId);
      await sb
        .from("bot_instances")
        .update({ status: "connected" })
        .eq("instance_id", instanceId);
      res.json({ success: true, message: "Bot sedang dihidupkan..." });
    } else {
      botManager.resumeInstance(instanceId);
      await sb
        .from("bot_instances")
        .update({ status: "connected" })
        .eq("instance_id", instanceId);
      res.json({ success: true, message: "Bot dilanjutkan." });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/bot/:instanceId/stop
botRouter.post("/:instanceId/stop", (req, res) => {
  botManager.stopInstance(req.params.instanceId);
  res.json({ success: true, message: "Instance dihentikan." });
});

// POST /api/bot/:instanceId/logout
botRouter.post("/:instanceId/logout", async (req, res) => {
  try {
    await botManager.logoutInstance(req.params.instanceId);
    const sb = getAuthedClient(req.userToken!);
    await sb
      .from("bot_instances")
      .update({ status: "stopped", phone: null })
      .eq("instance_id", req.params.instanceId);
    res.json({ success: true, message: "Session WhatsApp dihapus." });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/bot/:instanceId/send
botRouter.post("/:instanceId/send", async (req, res) => {
  try {
    const { to, message } = req.body;
    if (!to || !message) {
      res.status(400).json({ success: false, error: "Parameter 'to' dan 'message' diperlukan." });
      return;
    }
    const ok = await botManager.sendMessage(req.params.instanceId, to, message);
    if (ok) {
      res.json({ success: true });
    } else {
      res.status(500).json({ success: false, error: "Gagal mengirim. Instance tidak terhubung." });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/bot/:instanceId/disable-sender — nonaktifkan bot untuk satu nomor
botRouter.post("/:instanceId/disable-sender", async (req, res) => {
  try {
    const { sender } = req.body;
    if (!sender) {
      res.status(400).json({ success: false, error: "Parameter 'sender' diperlukan." });
      return;
    }
    await botManager.disableBotForSender(req.params.instanceId, sender);
    console.log(`[${req.params.instanceId}] Bot dinonaktifkan untuk ${sender} oleh admin`);
    res.json({ success: true, message: "Bot dinonaktifkan untuk nomor tersebut." });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/bot/:instanceId/enable-sender — aktifkan kembali bot untuk satu nomor
botRouter.post("/:instanceId/enable-sender", async (req, res) => {
  try {
    const { sender } = req.body;
    if (!sender) {
      res.status(400).json({ success: false, error: "Parameter 'sender' diperlukan." });
      return;
    }
    await botManager.enableBotForSender(req.params.instanceId, sender);
    console.log(`[${req.params.instanceId}] Bot diaktifkan kembali untuk ${sender} oleh admin`);
    res.json({ success: true, message: "Bot diaktifkan kembali untuk nomor tersebut." });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/bot/:instanceId/disabled-senders — daftar nomor yang botnya nonaktif
botRouter.get("/:instanceId/disabled-senders", async (req, res) => {
  try {
    const senders = await botManager.getDisabledSenders(req.params.instanceId);
    res.json({ senders });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/bot/:instanceId — hapus instance
botRouter.delete("/:instanceId", async (req, res) => {
  try {
    const { instanceId } = req.params;
    await botManager.fullLogoutInstance(instanceId);
    botManager.removeInstance(instanceId);
    const sb = getAuthedClient(req.userToken!);
    await sb.from("bot_instances").delete().eq("instance_id", instanceId);
    res.json({ success: true, message: "Instance dihapus." });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.use("/api/bot", botRouter);

app.listen(PORT, async () => {
  console.log(`\n╔══════════════════════════════════╗`);
  console.log(`║   WhatsApp Bot API Server        ║`);
  console.log(`║   Running on http://localhost:${PORT}  ║`);
  console.log(`╚══════════════════════════════════╝\n`);

  // Auto-run database migration on startup
  await runMigration();

  // Restore existing multi-instance sockets
  await botManager.restoreInstances();

  // Auto-associate remaining "connected" instances dengan legacy socket
  const legacyStatus = getBotStatus();
  if (legacyStatus.bot === "connected") {
    const legacySock = getSocket();
    const { data: dbInstances } = await supabase
      .from("bot_instances")
      .select("instance_id, user_id, status");
    for (const inst of dbInstances || []) {
      const bs = botManager.getStatus(inst.instance_id);
      if (bs.bot === "stopped" && inst.status === "connected") {
        botManager.registerLegacyInstance(inst.instance_id, legacySock, legacyStatus.phone, inst.user_id);
        console.log(`[Startup] Auto-associated ${inst.instance_id.slice(0, 8)}... dengan legacy socket`);
      }
    }
  }

  // Start scheduler for pending scheduled messages
  startScheduler();

  console.log(`Dashboard frontend terhubung ke sini via VITE_BOT_API_URL`);
  console.log(`Buka dashboard dan klik "WhatsApp" untuk memulai koneksi.\n`);

  setInterval(() => {
    const s = getBotStatus();
    console.log(`[Heartbeat ${new Date().toLocaleTimeString()}] Bot: ${s.bot}, Phone: ${s.phone || "-"}`);
  }, 30000);
});
