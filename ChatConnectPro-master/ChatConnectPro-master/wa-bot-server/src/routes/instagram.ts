import { Router } from "express";
import { supabase } from "../supabase.js";
import { authMiddleware } from "../middleware/auth.js";
import { InstagramClient } from "../instagram.js";

const router = Router();

// Helper: cari instance Instagram milik user
async function findInstagramInstance(userId: string) {
  const { data } = await supabase
    .from("bot_instances")
    .select("*")
    .eq("user_id", userId)
    .eq("platform", "instagram")
    .single();
  return data || null;
}

// POST /api/channel/instagram/connect — simpan credentials Instagram
router.post("/api/channel/instagram/connect", authMiddleware, async (req, res) => {
  try {
    const { page_id, access_token, ig_user_id, verify_token } = req.body;

    if (!page_id || !access_token || !ig_user_id || !verify_token) {
      res.status(400).json({ error: "Semua field wajib: page_id, access_token, ig_user_id, verify_token" });
      return;
    }

    // Cek apakah sudah ada instance Instagram untuk user ini
    const existing = await findInstagramInstance(req.userId!);
    if (existing) {
      // Simpan credentials lama ke history sebelum overwrite
      const oldCreds = existing.credentials;
      const prevHistory = (existing.previous_credentials as any[]) || [];
      const newHistory = oldCreds ? [...prevHistory, { saved_at: new Date().toISOString(), credentials: oldCreds }] : prevHistory;

      // Update existing
      const { error } = await supabase
        .from("bot_instances")
        .update({
          credentials: { page_id, access_token, ig_user_id, verify_token },
          previous_credentials: newHistory,
          status: "connected",
          phone: ig_user_id,
        })
        .eq("instance_id", existing.instance_id);

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
    } else {
      // Buat instance baru
      const instanceId = crypto.randomUUID();
      const { error } = await supabase.from("bot_instances").insert({
        user_id: req.userId!,
        instance_id: instanceId,
        platform: "instagram",
        phone: ig_user_id,
        status: "connected",
        credentials: { page_id, access_token, ig_user_id, verify_token },
      });

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
    }

    console.log(`[Instagram] Credentials saved for user ${req.userId!.slice(0, 8)}...`);
    res.json({ success: true, message: "Instagram berhasil dikonfigurasi." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/channel/instagram/test — test koneksi Instagram
router.post("/api/channel/instagram/test", authMiddleware, async (req, res) => {
  try {
    const inst = await findInstagramInstance(req.userId!);
    if (!inst || !inst.credentials) {
      res.status(400).json({ error: "Instagram belum dikonfigurasi." });
      return;
    }

    const creds = inst.credentials as any;
    const client = new InstagramClient(creds.page_id, creds.access_token, creds.ig_user_id);
    const result = await client.testConnection();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/channel/instagram/status — status koneksi Instagram
router.get("/api/channel/instagram/status", authMiddleware, async (req, res) => {
  try {
    const inst = await findInstagramInstance(req.userId!);
    if (!inst) {
      res.json({ connected: false, configured: false });
      return;
    }

    res.json({
      connected: inst.status === "connected",
      configured: true,
      ig_user_id: inst.phone || null,
      status: inst.status,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
