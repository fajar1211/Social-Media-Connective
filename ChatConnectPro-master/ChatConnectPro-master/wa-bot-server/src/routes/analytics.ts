import { Router } from "express";
import { supabase } from "../supabase.js";
import { authMiddleware, getAuthedClient } from "../middleware/auth.js";

const router = Router();

router.get("/api/analytics", authMiddleware, async (req, res) => {
  try {
    const sb = getAuthedClient(req.userToken!);
    const { data: instances, error: instErr } = await sb
      .from("bot_instances")
      .select("*")
      .eq("user_id", req.userId!);

    if (instErr) {
      res.status(500).json({ error: instErr.message });
      return;
    }

    const instanceIds = (instances || []).map(i => i.instance_id);
    const totalInstances = instances?.length || 0;
    const connectedInstances = instances?.filter(i => i.status === "connected").length || 0;

    if (instanceIds.length === 0) {
      res.json({
        instances: { total: 0, connected: 0, disconnected: 0 },
        conversations: { total: 0, active: 0 },
        messages: { total: 0, incoming: 0, outgoing: 0, aiReplies: 0 },
        platformBreakdown: {},
        dailyActivity: [],
        topSenders: [],
        responseRate: 0,
        instancePhones: [],
      });
      return;
    }

    const { data: chats, error: chatErr } = await supabase
      .from("bot_chats")
      .select("*")
      .in("instance_id", instanceIds)
      .order("created_at", { ascending: false });

    if (chatErr) {
      res.status(500).json({ error: chatErr.message });
      return;
    }

    const allChats = chats || [];
    const totalMessages = allChats.length;
    const incoming = allChats.filter(c => c.direction === "incoming");
    const outgoing = allChats.filter(c => c.direction === "outgoing");
    const aiRepliesCount = outgoing.length;

    const uniqueSenders = new Set(allChats.map(c => c.sender));
    const activeConversations = uniqueSenders.size;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyMap: Record<string, { incoming: number; outgoing: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dailyMap[d.toDateString()] = { incoming: 0, outgoing: 0 };
    }

    allChats.forEach(c => {
      const key = new Date(c.created_at).toDateString();
      if (dailyMap[key]) {
        if (c.direction === "incoming") dailyMap[key].incoming++;
        else dailyMap[key].outgoing++;
      }
    });

    const dailyActivity = Object.entries(dailyMap).map(([date, counts]) => ({
      date,
      incoming: counts.incoming,
      outgoing: counts.outgoing,
    }));

    const senderCount = new Map<string, { name: string; count: number }>();
    incoming.forEach(c => {
      const existing = senderCount.get(c.sender) || { name: c.name || c.sender.split("@")[0], count: 0 };
      existing.count++;
      senderCount.set(c.sender, existing);
    });

    const topSenders = Array.from(senderCount.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([sender, val]) => ({ sender, name: val.name, count: val.count }));

    const responseRate = incoming.length > 0
      ? Math.round((aiRepliesCount / incoming.length) * 100)
      : 0;

    // Breakdown per platform
    const platformBreakdown: Record<string, { incoming: number; outgoing: number }> = {};
    const platforms = [...new Set(allChats.map(c => c.platform || "whatsapp"))];
    for (const p of platforms) {
      const pIncoming = allChats.filter(c => (c.platform || "whatsapp") === p && c.direction === "incoming").length;
      const pOutgoing = allChats.filter(c => (c.platform || "whatsapp") === p && c.direction === "outgoing").length;
      platformBreakdown[p] = { incoming: pIncoming, outgoing: pOutgoing };
    }

    res.json({
      instances: {
        total: totalInstances,
        connected: connectedInstances,
        disconnected: totalInstances - connectedInstances,
      },
      conversations: {
        total: allChats.length > 0 ? uniqueSenders.size : 0,
        active: activeConversations,
      },
      messages: {
        total: totalMessages,
        incoming: incoming.length,
        outgoing: outgoing.length,
        aiReplies: aiRepliesCount,
      },
      platformBreakdown,
      dailyActivity,
      topSenders,
      responseRate,
      instancePhones: instances?.map(i => ({ instance_id: i.instance_id, phone: i.phone, status: i.status })) || [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
