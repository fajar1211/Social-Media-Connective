import { Router } from "express";
import { supabase } from "../supabase.js";
import type { KnowledgeItem } from "../types.js";
import { invalidateKnowledgeCache } from "../knowledge.js";

const router = Router();

router.get("/api/knowledge", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("bot_knowledge_base")
      .select("*")
      .eq("user_id", req.userId)
      .order("sort_order", { ascending: true });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json(data as KnowledgeItem[]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/knowledge", async (req, res) => {
  try {
    const { question, answer, category } = req.body;

    if (!question || !answer) {
      res.status(400).json({ error: "Field 'question' dan 'answer' diperlukan." });
      return;
    }

    const { data, error } = await supabase
      .from("bot_knowledge_base")
      .insert({
        question,
        answer,
        category: category || "Umum",
        is_active: true,
        sort_order: 0,
        user_id: req.userId,
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    invalidateKnowledgeCache();
    res.json(data as KnowledgeItem);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/api/knowledge/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { question, answer, category, is_active, sort_order } = req.body;

    const updates: Record<string, unknown> = {};
    if (question !== undefined) updates.question = question;
    if (answer !== undefined) updates.answer = answer;
    if (category !== undefined) updates.category = category;
    if (is_active !== undefined) updates.is_active = is_active;
    if (sort_order !== undefined) updates.sort_order = sort_order;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("bot_knowledge_base")
      .update(updates)
      .eq("id", id)
      .eq("user_id", req.userId)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({ error: "Data tidak ditemukan atau bukan milik Anda." });
      return;
    }

    invalidateKnowledgeCache();
    res.json(data as KnowledgeItem);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/knowledge/bulk-delete", async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, error: "Array 'ids' diperlukan." });
      return;
    }

    const { error } = await supabase
      .from("bot_knowledge_base")
      .delete()
      .in("id", ids)
      .eq("user_id", req.userId);

    if (error) {
      res.status(500).json({ success: false, error: error.message });
      return;
    }

    invalidateKnowledgeCache();
    res.json({ success: true, deleted: ids.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/api/knowledge/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const { error } = await supabase
      .from("bot_knowledge_base")
      .delete()
      .eq("id", id)
      .eq("user_id", req.userId);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    invalidateKnowledgeCache();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/knowledge/refresh", async (req, res) => {
  try {
    invalidateKnowledgeCache();

    const { data, error } = await supabase
      .from("bot_knowledge_base")
      .select("*")
      .eq("is_active", true)
      .eq("user_id", req.userId)
      .order("sort_order", { ascending: true });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ success: true, count: data?.length || 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
