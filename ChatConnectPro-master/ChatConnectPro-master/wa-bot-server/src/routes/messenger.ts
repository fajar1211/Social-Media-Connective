import { Router } from "express";
import { supabase } from "../supabase.js";
import { authMiddleware } from "../middleware/auth.js";
import { MessengerClient } from "../messenger.js";

const router = Router();

async function findMessengerInstance(userId: string) {
  const { data } = await supabase
    .from("bot_instances")
    .select("*")
    .eq("user_id", userId)
    .eq("platform", "messenger")
    .single();
  return data || null;
}

// POST /api/channel/messenger/connect
router.post("/api/channel/messenger/connect", authMiddleware, async (req, res) => {
  try {
    const { page_id, access_token, verify_token, app_secret } = req.body;

    if (!page_id || !access_token || !verify_token || !app_secret) {
      res.status(400).json({ error: "Semua field wajib: page_id, access_token, verify_token, app_secret" });
      return;
    }

    const existing = await findMessengerInstance(req.userId!);
    if (existing) {
      // Simpan credentials lama ke history sebelum overwrite
      const oldCreds = existing.credentials;
      const prevHistory = (existing.previous_credentials as any[]) || [];
      const newHistory = oldCreds ? [...prevHistory, { saved_at: new Date().toISOString(), credentials: oldCreds }] : prevHistory;

      const { error } = await supabase
        .from("bot_instances")
        .update({
          credentials: { page_id, access_token, verify_token, app_secret },
          previous_credentials: newHistory,
          status: "connected",
          phone: page_id,
        })
        .eq("instance_id", existing.instance_id);

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
    } else {
      const instanceId = crypto.randomUUID();
      const { error } = await supabase.from("bot_instances").insert({
        user_id: req.userId!,
        instance_id: instanceId,
        platform: "messenger",
        phone: page_id,
        status: "connected",
        credentials: { page_id, access_token, verify_token, app_secret },
      });

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
    }

    console.log(`[Messenger] Credentials saved for user ${req.userId!.slice(0, 8)}...`);
    res.json({ success: true, message: "Messenger berhasil dikonfigurasi." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/channel/messenger/test
router.post("/api/channel/messenger/test", authMiddleware, async (req, res) => {
  try {
    const inst = await findMessengerInstance(req.userId!);
    if (!inst || !inst.credentials) {
      res.status(400).json({ error: "Messenger belum dikonfigurasi." });
      return;
    }

    const creds = inst.credentials as any;
    const client = new MessengerClient(creds.page_id, creds.access_token, creds.app_secret);
    const result = await client.testConnection();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/channel/messenger/status
router.get("/api/channel/messenger/status", authMiddleware, async (req, res) => {
  try {
    const inst = await findMessengerInstance(req.userId!);
    if (!inst) {
      res.json({ connected: false, configured: false });
      return;
    }

    res.json({
      connected: inst.status === "connected",
      configured: true,
      page_id: inst.phone || null,
      status: inst.status,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
