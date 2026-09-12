import { Router } from "express";
import { supabase } from "../supabase.js";
import { authMiddleware, getAuthedClient } from "../middleware/auth.js";

const router = Router();

router.get("/api/scheduled", authMiddleware, async (req, res) => {
  try {
    const sb = getAuthedClient(req.userToken!);
    let query = sb
      .from("bot_scheduled")
      .select("*")
      .eq("user_id", req.userId!);

    const instanceId = req.query.instance_id as string | undefined;
    if (instanceId) {
      query = query.eq("instance_id", instanceId);
    }

    const { data, error } = await query.order("scheduled_at", { ascending: false });

    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/scheduled", authMiddleware, async (req, res) => {
  try {
    const { recipient, message, scheduled_at, platform, instance_id } = req.body;
    if (!recipient || !message || !scheduled_at) {
      res.status(400).json({ error: "recipient, message, dan scheduled_at wajib diisi" });
      return;
    }

    const sb = getAuthedClient(req.userToken!);

    // Validate instance_id belongs to user if provided
    if (instance_id) {
      const { data: inst, error: instErr } = await sb
        .from("bot_instances")
        .select("instance_id")
        .eq("instance_id", instance_id)
        .eq("user_id", req.userId!)
        .single();

      if (instErr || !inst) {
        res.status(400).json({ error: "Instance tidak ditemukan atau bukan milik Anda" });
        return;
      }
    }

    const { data, error } = await sb
      .from("bot_scheduled")
      .insert({
        user_id: req.userId!,
        recipient,
        message,
        scheduled_at,
        platform: platform || "whatsapp",
        instance_id: instance_id || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/api/scheduled/:id/cancel", authMiddleware, async (req, res) => {
  try {
    const sb = getAuthedClient(req.userToken!);
    const { data, error } = await sb
      .from("bot_scheduled")
      .update({ status: "cancelled" })
      .eq("id", req.params.id)
      .eq("user_id", req.userId!)
      .select()
      .single();

    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/scheduled/bulk-delete", authMiddleware, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: "ids wajib berupa array dan tidak boleh kosong" });
      return;
    }
    const sb = getAuthedClient(req.userToken!);
    const { error } = await sb
      .from("bot_scheduled")
      .delete()
      .in("id", ids)
      .eq("user_id", req.userId!);

    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json({ success: true, deleted: ids.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/api/scheduled/:id", authMiddleware, async (req, res) => {
  try {
    const sb = getAuthedClient(req.userToken!);
    const { error } = await sb
      .from("bot_scheduled")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.userId!);

    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
