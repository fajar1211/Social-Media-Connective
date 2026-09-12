import { Router } from "express";
import { supabase } from "../supabase.js";
import { sendMessage } from "../whatsapp.js";
import { authMiddleware, getAuthedClient } from "../middleware/auth.js";
import type { ChatMessage, Conversation } from "../types.js";

const router = Router();

// Helper: filter chats by user's instance IDs OR legacy chats (instance_id IS NULL)
function filterByInstances(query: any, instanceIds: string[]) {
  if (instanceIds.length === 0) {
    return query.is("instance_id", null);
  }
  return query.or(`instance_id.in.(${instanceIds.join(",")}),instance_id.is.null`);
}

router.get("/api/conversations", authMiddleware, async (req, res) => {
  try {
    const platform = req.query.platform as string | undefined;
    const sb = getAuthedClient(req.userToken!);
    const { data: instances, error: instErr } = await sb
      .from("bot_instances")
      .select("instance_id")
      .eq("user_id", req.userId!);

    if (instErr) {
      res.status(500).json({ error: instErr.message });
      return;
    }

    const instanceIds = (instances || []).map(i => i.instance_id);
    if (instanceIds.length === 0) {
      res.json([]);
      return;
    }

    let query = filterByInstances(
      supabase.from("bot_chats").select("sender, name, message, created_at, instance_id, platform"),
      instanceIds
    );

    if (platform) {
      query = query.eq("platform", platform);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    const map = new Map<string, { name: string; last_message: string; last_chat: string }>();

    for (const row of data) {
      const key = row.sender;
      if (!map.has(key)) {
        map.set(key, {
          name: row.name || key.split("@")[0] || key,
          last_message: row.message,
          last_chat: row.created_at,
        });
      }
    }

    const conversations: Conversation[] = Array.from(map.entries())
      .map(([sender, val]) => ({
        sender,
        name: val.name,
        last_message: val.last_message,
        last_chat: val.last_chat,
      }))
      .sort((a, b) => new Date(b.last_chat).getTime() - new Date(a.last_chat).getTime());

    res.json(conversations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/chats", authMiddleware, async (req, res) => {
  try {
    const sender = req.query.sender as string | undefined;
    const instanceId = req.query.instance_id as string | undefined;
    const platform = req.query.platform as string | undefined;
    const limit = Math.min(Number(req.query.limit) || 100, 500);

    const sb = getAuthedClient(req.userToken!);
    const { data: instances, error: instErr } = await sb
      .from("bot_instances")
      .select("instance_id")
      .eq("user_id", req.userId!);

    if (instErr) {
      res.status(500).json({ error: instErr.message });
      return;
    }

    const instanceIds = (instances || []).map(i => i.instance_id);
    if (instanceIds.length === 0) {
      res.json([]);
      return;
    }

    let query = filterByInstances(
      supabase.from("bot_chats").select("*"),
      instanceIds
    ).order("created_at", { ascending: false }).limit(limit);

    if (sender) {
      query = query.eq("sender", sender);
    }
    if (instanceId) {
      query = query.eq("instance_id", instanceId);
    }
    if (platform) {
      query = query.eq("platform", platform);
    }

    const { data, error } = await query;

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    const chats: ChatMessage[] = (data || []).reverse();
    res.json(chats);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/api/send", authMiddleware, async (req, res) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      res.status(400).json({ success: false, error: "Parameter 'to' dan 'message' diperlukan." });
      return;
    }

    const ok = await sendMessage(to, message);
    if (ok) {
      res.json({ success: true });
    } else {
      res.status(500).json({ success: false, error: "Gagal mengirim pesan. Bot mungkin tidak terhubung." });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/api/chats/:sender", authMiddleware, async (req, res) => {
  try {
    const sender = req.params.sender;
    const sb = getAuthedClient(req.userToken!);
    const { data: instances, error: instErr } = await sb
      .from("bot_instances")
      .select("instance_id")
      .eq("user_id", req.userId!);

    if (instErr) {
      res.status(500).json({ success: false, error: instErr.message });
      return;
    }

    const instanceIds = (instances || []).map(i => i.instance_id);
    if (instanceIds.length === 0) {
      res.status(404).json({ success: false, error: "No instances found" });
      return;
    }

    const { error } = await filterByInstances(
      supabase.from("bot_chats").delete().eq("sender", sender),
      instanceIds
    );

    if (error) {
      res.status(500).json({ success: false, error: error.message });
      return;
    }

    console.log(`[Chats] Deleted all messages from: ${sender}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/api/chats", authMiddleware, async (req, res) => {
  try {
    const sb = getAuthedClient(req.userToken!);
    const { data: instances, error: instErr } = await sb
      .from("bot_instances")
      .select("instance_id")
      .eq("user_id", req.userId!);

    if (instErr) {
      res.status(500).json({ success: false, error: instErr.message });
      return;
    }

    const instanceIds = (instances || []).map(i => i.instance_id);
    if (instanceIds.length === 0) {
      res.json({ success: true, deleted: 0 });
      return;
    }

    const { error, count } = await filterByInstances(
      supabase.from("bot_chats").delete({ count: "exact" }),
      instanceIds
    );

    if (error) {
      res.status(500).json({ success: false, error: error.message });
      return;
    }

    console.log(`[Chats] All messages cleared for user ${req.userId}`);
    res.json({ success: true, deleted: count || 0 });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/api/chats/bulk-delete", authMiddleware, async (req, res) => {
  try {
    const { senders } = req.body;
    if (!Array.isArray(senders) || senders.length === 0) {
      res.status(400).json({ error: "senders wajib berupa array dan tidak boleh kosong" });
      return;
    }

    const sb = getAuthedClient(req.userToken!);
    const { data: instances, error: instErr } = await sb
      .from("bot_instances")
      .select("instance_id")
      .eq("user_id", req.userId!);

    if (instErr) { res.status(500).json({ success: false, error: instErr.message }); return; }

    const instanceIds = (instances || []).map(i => i.instance_id);
    if (instanceIds.length === 0) {
      res.json({ success: true, deleted: 0 });
      return;
    }

    const { error, count } = await filterByInstances(
      supabase.from("bot_chats").delete({ count: "exact" }).in("sender", senders),
      instanceIds
    );

    if (error) { res.status(500).json({ success: false, error: error.message }); return; }
    res.json({ success: true, deleted: count || senders.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/chats/export — export chats sebagai CSV atau JSON
router.get("/api/chats/export", authMiddleware, async (req, res) => {
  try {
    const format = (req.query.format as string) || "csv";
    const sender = req.query.sender as string | undefined;
    const platform = req.query.platform as string | undefined;
    const instanceId = req.query.instance_id as string | undefined;

    const sb = getAuthedClient(req.userToken!);
    const { data: instances, error: instErr } = await sb
      .from("bot_instances")
      .select("instance_id")
      .eq("user_id", req.userId!);

    if (instErr) { res.status(500).json({ error: instErr.message }); return; }

    const instanceIds = (instances || []).map(i => i.instance_id);
    if (instanceIds.length === 0) {
      res.status(400).json({ error: "Tidak ada instance" });
      return;
    }

    let query = filterByInstances(
      supabase.from("bot_chats").select("*"),
      instanceIds
    ).order("created_at", { ascending: true });

    if (sender) query = query.eq("sender", sender);
    if (platform) query = query.eq("platform", platform);
    if (instanceId) query = query.eq("instance_id", instanceId);

    const { data, error } = await query;
    if (error) { res.status(500).json({ error: error.message }); return; }

    if (format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="chats-export.json"`);
      res.json(data || []);
      return;
    }

    // Default: CSV
    const header = "id,sender,name,message,direction,platform,instance_id,recipient,is_read,created_at";
    const rows = (data || []).map((r: any) =>
      [r.id, r.sender, `"${(r.name || "").replace(/"/g, '""')}"`, `"${r.message.replace(/"/g, '""')}"`, r.direction, r.platform, r.instance_id, r.recipient || "", r.is_read, r.created_at].join(",")
    );
    const csv = [header, ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="chats-export.csv"`);
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
