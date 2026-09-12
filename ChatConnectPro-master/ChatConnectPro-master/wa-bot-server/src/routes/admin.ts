import { Router } from "express";
import { supabase } from "../supabase.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

async function requireAdmin(req: any, res: any, next: any) {
  try {
    const { data } = await supabase
      .from("admin_users")
      .select("id")
      .eq("id", req.userId!)
      .single();
    if (!data) {
      res.status(403).json({ error: "Akses ditolak: bukan admin" });
      return;
    }
    next();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

router.use(authMiddleware, requireAdmin);

router.get("/api/admin/instances", async (req, res) => {
  try {
    const platform = req.query.platform as string | undefined;
    const userId = req.query.user_id as string | undefined;
    let query = supabase
      .from("bot_instances")
      .select("*")
      .order("created_at", { ascending: false });
    if (platform) query = query.eq("platform", platform);
    if (userId) query = query.eq("user_id", userId);
    const { data, error } = await query;
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/admin/chats", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const offset = Number(req.query.offset) || 0;
    const sender = req.query.sender as string | undefined;
    const platform = req.query.platform as string | undefined;
    const userId = req.query.user_id as string | undefined;

    let instanceIds: string[] | undefined;
    if (userId) {
      const { data: instances } = await supabase
        .from("bot_instances")
        .select("instance_id")
        .eq("user_id", userId);
      instanceIds = (instances || []).map(i => i.instance_id);
      if (instanceIds.length === 0) {
        res.json({ data: [], total: 0, limit, offset });
        return;
      }
    }

    let query = supabase
      .from("bot_chats")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (sender) query = query.eq("sender", sender);
    if (platform) query = query.eq("platform", platform);
    if (instanceIds) query = query.in("instance_id", instanceIds);

    const { data, error, count } = await query;
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json({ data: (data || []).reverse(), total: count || 0, limit, offset });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/admin/profile/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const { data: adminData } = await supabase
      .from("admin_users")
      .select("id, email, name, avatar_url")
      .eq("id", userId)
      .maybeSingle();
    const { data: storageData } = await supabase
      .from("bot_auth_store")
      .select("data")
      .eq("instance_id", userId)
      .eq("filename", "profile")
      .maybeSingle();
    const profile = storageData?.data || {};
    res.json({
      id: userId,
      email: adminData?.email || null,
      name: adminData?.name || null,
      avatar_url: adminData?.avatar_url || null,
      business_name: profile.business_name || null,
      phone: profile.phone || null,
      additional_email: profile.additional_email || null,
      address: profile.address || null,
      logo_url: profile.logo_url || null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/admin/scheduled", async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    let query = supabase
      .from("bot_scheduled")
      .select("*")
      .order("scheduled_at", { ascending: false });
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
