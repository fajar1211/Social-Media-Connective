import { Router } from "express";
import { supabase } from "../supabase.js";
import { authMiddleware, getAuthedClient } from "../middleware/auth.js";

const router = Router();

// GET /api/admin/users — daftar semua user (hanya admin_users)
router.get("/api/admin/users", authMiddleware, async (req, res) => {
  try {
    // Cek apakah user terdaftar sebagai admin
    const sb = getAuthedClient(req.userToken!);
    const { data: adminCheck } = await sb
      .from("admin_users")
      .select("id")
      .eq("id", req.userId!)
      .single();

    if (!adminCheck) {
      res.status(403).json({ error: "Akses ditolak: bukan admin" });
      return;
    }

    const { data, error } = await supabase
      .from("admin_users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/stats — statistik global (total user, instance, chats)
router.get("/api/admin/stats", authMiddleware, async (req, res) => {
  try {
    const sb = getAuthedClient(req.userToken!);
    const { data: adminCheck } = await sb
      .from("admin_users")
      .select("id")
      .eq("id", req.userId!)
      .single();

    if (!adminCheck) {
      res.status(403).json({ error: "Akses ditolak: bukan admin" });
      return;
    }

    const [{ count: totalUsers }, { count: totalInstances }, { count: totalChats }, { count: connectedInstances }] = await Promise.all([
      supabase.from("admin_users").select("*", { count: "exact", head: true }),
      supabase.from("bot_instances").select("*", { count: "exact", head: true }),
      supabase.from("bot_chats").select("*", { count: "exact", head: true }),
      supabase.from("bot_instances").select("*", { count: "exact", head: true }).eq("status", "connected"),
    ]);

    res.json({
      totalUsers: totalUsers || 0,
      totalInstances: totalInstances || 0,
      connectedInstances: connectedInstances || 0,
      totalChats: totalChats || 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/users/:id/reset-password — reset password user oleh admin
router.put("/api/admin/users/:id/reset-password", authMiddleware, async (req, res) => {
  try {
    const sb = getAuthedClient(req.userToken!);
    const { data: adminCheck } = await sb
      .from("admin_users")
      .select("id")
      .eq("id", req.userId!)
      .single();

    if (!adminCheck) {
      res.status(403).json({ error: "Akses ditolak: bukan admin" });
      return;
    }

    const { password } = req.body;
    if (!password || password.length < 6) {
      res.status(400).json({ error: "Password minimal 6 karakter" });
      return;
    }

    const { data, error } = await supabase.auth.admin.updateUserById(
      req.params.id as string,
      { password }
    );

    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:id — hapus user
router.delete("/api/admin/users/:id", authMiddleware, async (req, res) => {
  try {
    const sb = getAuthedClient(req.userToken!);
    const { data: adminCheck } = await sb
      .from("admin_users")
      .select("id")
      .eq("id", req.userId!)
      .single();

    if (!adminCheck) {
      res.status(403).json({ error: "Akses ditolak: bukan admin" });
      return;
    }

    const { error } = await supabase
      .from("admin_users")
      .delete()
      .eq("id", req.params.id);

    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
