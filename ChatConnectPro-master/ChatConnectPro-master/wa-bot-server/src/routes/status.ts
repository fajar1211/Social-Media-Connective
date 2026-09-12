import { Router } from "express";
import { getBotStatus, startBot, stopBot, logoutBot } from "../whatsapp.js";
import { botManager } from "../bot-manager.js";

const router = Router();

router.get("/", (_req, res) => {
  // Cek legacy bot dulu
  const legacy = getBotStatus();
  if (legacy.bot === "connected") {
    res.json({ status: "ok", bot: legacy.bot, phone: legacy.phone });
    return;
  }

  // Fallback ke multi-instance: cari instance yang connected
  const allInstances = botManager.getAllInstances();
  for (const id of allInstances) {
    const s = botManager.getStatus(id);
    if (s.bot === "connected") {
      res.json({ status: "ok", bot: s.bot, phone: s.phone });
      return;
    }
  }

  res.json({ status: "ok", bot: legacy.bot, phone: legacy.phone });
});

router.get("/api/qr", (_req, res) => {
  const status = getBotStatus();
  if (status.qr) {
    res.json({ qr: status.qr });
  } else {
    res.json({ qr: null, message: "Tidak ada QR. Bot mungkin sudah terhubung atau belum diinisialisasi." });
  }
});

router.post("/api/bot/restart", async (_req, res) => {
  try {
    await startBot();
    res.json({ success: true, message: "Bot sedang diinisialisasi. Silakan scan QR di terminal." });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/api/bot/stop", (_req, res) => {
  stopBot();
  res.json({ success: true, message: "Bot dihentikan." });
});

router.post("/api/bot/logout", async (_req, res) => {
  try {
    await logoutBot();
    res.json({ success: true, message: "Session WhatsApp dihapus." });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
