import { Router } from "express";
import { supabase } from "../supabase.js";
import { authMiddleware } from "../middleware/auth.js";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

const PROFILE_KEY = "profile";

const router = Router();

// GET /api/admin/profile — ambil profil user yang login
router.get("/api/admin/profile", authMiddleware, async (req, res) => {
  try {
    const [adminResult, storageResult] = await Promise.all([
      supabase
        .from("admin_users")
        .select("id, email, name, avatar_url")
        .eq("id", req.userId!)
        .maybeSingle(),
      supabase
        .from("bot_auth_store")
        .select("data")
        .eq("instance_id", req.userId!)
        .eq("filename", PROFILE_KEY)
        .maybeSingle(),
    ]);

    if (adminResult.error && storageResult.error) {
      res.status(500).json({ error: adminResult.error.message });
      return;
    }

    const profile = storageResult.data?.data || {};
    res.json({
      id: req.userId!,
      email: adminResult.data?.email || null,
      name: adminResult.data?.name || null,
      avatar_url: adminResult.data?.avatar_url || null,
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

// PUT /api/admin/profile — simpan profil user yang login
router.put("/api/admin/profile", authMiddleware, async (req, res) => {
  try {
    const { business_name, phone, additional_email, address, logo_url } = req.body;

    // Baca data existing dulu biar tidak timpa field lain
    const { data: existing } = await supabase
      .from("bot_auth_store")
      .select("data")
      .eq("instance_id", req.userId!)
      .eq("filename", PROFILE_KEY)
      .maybeSingle();

    const existingData = existing?.data || {};

    // Merge: hanya update field yang dikirim
    if (business_name !== undefined) existingData.business_name = business_name;
    if (phone !== undefined) existingData.phone = phone;
    if (additional_email !== undefined) existingData.additional_email = additional_email;
    if (address !== undefined) existingData.address = address;
    if (logo_url !== undefined) existingData.logo_url = logo_url;

    const { data, error } = await supabase
      .from("bot_auth_store")
      .upsert(
        {
          instance_id: req.userId!,
          filename: PROFILE_KEY,
          data: existingData,
        },
        { onConflict: "instance_id, filename" }
      )
      .select("data")
      .maybeSingle();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    const saved = data?.data || existingData;

    // get basic info
    const { data: adminData } = await supabase
      .from("admin_users")
      .select("id, email, name, avatar_url")
      .eq("id", req.userId!)
      .maybeSingle();

    res.json({
      id: req.userId!,
      email: adminData?.email || null,
      name: adminData?.name || null,
      avatar_url: adminData?.avatar_url || null,
      business_name: saved.business_name || null,
      phone: saved.phone || null,
      additional_email: saved.additional_email || null,
      address: saved.address || null,
      logo_url: saved.logo_url || null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/profile/logo — upload logo
router.post("/api/admin/profile/logo", authMiddleware, upload.single("logo"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "File logo wajib diupload" });
      return;
    }

    const ext = req.file.originalname.split(".").pop() || "png";
    const fileName = `logo-${req.userId!}-${Date.now()}.${ext}`;

    // Pastikan bucket ada
    let bucketExists = false;
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      bucketExists = !!buckets?.find((b) => b.name === "logos");
    } catch {}

    if (!bucketExists) {
      try {
        await supabase.storage.createBucket("logos", { public: true });
      } catch {}
    }

    const { data, error } = await supabase.storage
      .from("logos")
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (error) { res.status(500).json({ error: error.message }); return; }

    const { data: urlData } = supabase.storage
      .from("logos")
      .getPublicUrl(data.path);

    // Simpan logo_url ke profile
    const logoUrl = urlData.publicUrl;
    const { data: existing } = await supabase
      .from("bot_auth_store")
      .select("data")
      .eq("instance_id", req.userId!)
      .eq("filename", PROFILE_KEY)
      .maybeSingle();

    const profileData = existing?.data || {};
    profileData.logo_url = logoUrl;

    await supabase
      .from("bot_auth_store")
      .upsert(
        { instance_id: req.userId!, filename: PROFILE_KEY, data: profileData },
        { onConflict: "instance_id, filename" }
      );

    res.json({ logo_url: logoUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
