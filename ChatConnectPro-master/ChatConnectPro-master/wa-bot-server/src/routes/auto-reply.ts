import { Router } from "express";
import { supabase } from "../supabase.js";
import { authMiddleware, getAuthedClient } from "../middleware/auth.js";

const router = Router();

router.get("/api/auto-reply", authMiddleware, async (req, res) => {
  try {
    const sb = getAuthedClient(req.userToken!);
    const { data, error } = await sb
      .from("bot_auto_reply")
      .select("*")
      .eq("user_id", req.userId!)
      .order("created_at", { ascending: false });

    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/auto-reply", authMiddleware, async (req, res) => {
  try {
    const { keyword, reply, match_type, platform, instance_id } = req.body;
    if (!keyword || !reply) {
      res.status(400).json({ error: "keyword dan reply wajib diisi" });
      return;
    }

    const sb = getAuthedClient(req.userToken!);
    const { data, error } = await sb
      .from("bot_auto_reply")
      .insert({
        user_id: req.userId!,
        keyword,
        reply,
        match_type: match_type || "exact",
        platform: platform || "whatsapp",
        instance_id: instance_id || null,
      })
      .select()
      .single();

    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/api/auto-reply/:id", authMiddleware, async (req, res) => {
  try {
    const sb = getAuthedClient(req.userToken!);
    const { data, error } = await sb
      .from("bot_auto_reply")
      .update(req.body)
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

router.delete("/api/auto-reply/:id", authMiddleware, async (req, res) => {
  try {
    const sb = getAuthedClient(req.userToken!);
    const { error } = await sb
      .from("bot_auto_reply")
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
