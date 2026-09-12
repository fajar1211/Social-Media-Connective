import "dotenv/config";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const PROJECT_REF = "qrekawthcoqmletohdzf";

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS public.bot_auth_store (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_bot_auth_store_unique ON bot_auth_store(instance_id, filename)`,
  `CREATE INDEX IF NOT EXISTS idx_bot_auth_store_instance ON bot_auth_store(instance_id)`,
  `ALTER TABLE public.bot_auth_store DISABLE ROW LEVEL SECURITY`,

  /* Auto-reply rules */
  `CREATE TABLE IF NOT EXISTS public.bot_auto_reply (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    instance_id TEXT,
    platform TEXT NOT NULL DEFAULT 'whatsapp',
    keyword TEXT NOT NULL,
    reply TEXT NOT NULL,
    match_type TEXT NOT NULL DEFAULT 'exact',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE public.bot_auto_reply ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS auto_reply_user_policy ON public.bot_auto_reply`,
  `CREATE POLICY auto_reply_user_policy ON public.bot_auto_reply
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid())`,
  `CREATE INDEX IF NOT EXISTS idx_bot_auto_reply_user ON bot_auto_reply(user_id)`,

  /* Message templates */
  `CREATE TABLE IF NOT EXISTS public.bot_templates (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'whatsapp',
    category TEXT NOT NULL DEFAULT 'Umum',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE public.bot_templates ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS templates_user_policy ON public.bot_templates`,
  `CREATE POLICY templates_user_policy ON public.bot_templates
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid())`,
  `CREATE INDEX IF NOT EXISTS idx_bot_templates_user ON bot_templates(user_id)`,
];

export async function runMigration(): Promise<boolean> {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    console.warn(
      "\n⚠️  DATABASE_URL tidak ditemukan — tidak bisa migration otomatis.\n" +
      "   Pastikan tabel diperlukan sudah ada di Supabase.\n"
    );
    return false;
  }

  const client = new pg.Client({ connectionString: dbUrl, connectionTimeoutMillis: 8000 });

  try {
    await client.connect();
  } catch (err: any) {
    console.error("❌ Migration: gagal connect ke database:", err.message);
    return false;
  }

  let success = true;
  for (const sql of STATEMENTS) {
    try {
      await client.query(sql);
      console.log(`✅ ${sql.slice(0, 60)}...`);
    } catch (err: any) {
      console.error(`❌ ${sql.slice(0, 60)}... — ${err.message}`);
      success = false;
    }
  }

  await client.end().catch(() => {});

  // Create storage bucket via Supabase service role
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && supabaseKey) {
      const sb = createClient(supabaseUrl, supabaseKey);
      const { data: buckets } = await sb.storage.listBuckets();
      if (!buckets?.find((b) => b.name === "logos")) {
        const { error } = await sb.storage.createBucket("logos", { public: true });
        if (error) {
          console.error("❌ Gagal buat bucket logos:", error.message);
        } else {
          console.log("✅ Bucket logos berhasil dibuat");
        }
      } else {
        console.log("✅ Bucket logos sudah ada");
      }
    } else {
      console.warn("⚠️ SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY tidak ada — bucket logos tidak dibuat");
    }
  } catch (err: any) {
    console.error("❌ Gagal setup storage:", err.message);
  }

  return success;
}
