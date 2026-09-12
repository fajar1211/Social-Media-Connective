import { Router } from "express";
import { supabase } from "../supabase.js";
import { authMiddleware, getAuthedClient } from "../middleware/auth.js";
import { botManager } from "../bot-manager.js";

const router = Router();

router.post("/api/broadcast", authMiddleware, async (req, res) => {
  try {
    const { message, platform, instance_id } = req.body;
    if (!message) {
      res.status(400).json({ error: "message wajib diisi" });
      return;
    }

    const sb = getAuthedClient(req.userToken!);

    // Ambil semua kontak unik yang pernah chat dengan user ini
    let query = supabase
      .from("bot_chats")
      .select("sender, name, instance_id, platform");

    const { data: instances, error: instErr } = await sb
      .from("bot_instances")
      .select("instance_id")
      .eq("user_id", req.userId!);

    if (instErr) { res.status(500).json({ error: instErr.message }); return; }

    const instanceIds = (instances || []).map(i => i.instance_id);
    if (instanceIds.length === 0) {
      res.status(400).json({ error: "Tidak ada instance terhubung" });
      return;
    }

    query = query.in("instance_id", instanceIds);

    if (platform) query = query.eq("platform", platform);
    if (instance_id) query = query.eq("instance_id", instance_id);

    const { data: contacts, error } = await query;

    if (error) { res.status(500).json({ error: error.message }); return; }

    // Group kontak unik per instance
    const contactMap = new Map<string, Set<string>>();
    for (const c of contacts || []) {
      const key = c.instance_id;
      if (!contactMap.has(key)) contactMap.set(key, new Set());
      contactMap.get(key)!.add(c.sender);
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const [instId, senders] of contactMap) {
      const sock = botManager.getSocket(instId);
      if (!sock) {
        failed += senders.size;
        errors.push(`Instance ${instId}: socket tidak terhubung`);
        continue;
      }
      for (const sender of senders) {
        try {
          const jid = sender.includes("@") ? sender : `${sender}@s.whatsapp.net`;
          await sock.sendMessage(jid, { text: message });
          sent++;
        } catch (e: any) {
          failed++;
          errors.push(`Gagal kirim ke ${sender}: ${e.message}`);
        }
      }
    }

    res.json({
      success: true,
      sent,
      failed,
      total: sent + failed,
      errors: errors.slice(0, 10), // max 10 error di response
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
