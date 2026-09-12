import { Router } from "express";
import { supabase } from "../supabase.js";
import { authMiddleware, getAuthedClient } from "../middleware/auth.js";

const router = Router();

router.get("/api/templates", authMiddleware, async (req, res) => {
  try {
    const sb = getAuthedClient(req.userToken!);
    const { data, error } = await sb
      .from("bot_templates")
      .select("*")
      .eq("user_id", req.userId!)
      .order("created_at", { ascending: false });

    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/templates", authMiddleware, async (req, res) => {
  try {
    const { name, content, platform, category } = req.body;
    if (!name || !content) {
      res.status(400).json({ error: "name dan content wajib diisi" });
      return;
    }

    const sb = getAuthedClient(req.userToken!);
    const { data, error } = await sb
      .from("bot_templates")
      .insert({
        user_id: req.userId!,
        name,
        content,
        platform: platform || "whatsapp",
        category: category || "Umum",
      })
      .select()
      .single();

    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/api/templates/:id", authMiddleware, async (req, res) => {
  try {
    const sb = getAuthedClient(req.userToken!);
    const { data, error } = await sb
      .from("bot_templates")
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

router.delete("/api/templates/:id", authMiddleware, async (req, res) => {
  try {
    const sb = getAuthedClient(req.userToken!);
    const { error } = await sb
      .from("bot_templates")
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
