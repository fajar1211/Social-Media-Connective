-- ============================================================
-- ChatConnect Pro — Supabase Migration
-- Jalankan SQL ini di Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Auto-reply rules
CREATE TABLE IF NOT EXISTS public.bot_auto_reply (
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
);

ALTER TABLE public.bot_auto_reply ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auto_reply_user_policy ON public.bot_auto_reply;
CREATE POLICY auto_reply_user_policy ON public.bot_auto_reply
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_bot_auto_reply_user ON bot_auto_reply(user_id);

-- 2. Message templates
CREATE TABLE IF NOT EXISTS public.bot_templates (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'whatsapp',
  category TEXT NOT NULL DEFAULT 'Umum',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bot_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS templates_user_policy ON public.bot_templates;
CREATE POLICY templates_user_policy ON public.bot_templates
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_bot_templates_user ON bot_templates(user_id);
