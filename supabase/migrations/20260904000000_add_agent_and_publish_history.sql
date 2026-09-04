-- Migration: Add agent columns and publish_history table
-- Run this in Supabase SQL Editor

-- 1. Add agent-related columns to content table
ALTER TABLE content ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE content ADD COLUMN IF NOT EXISTS platform_post_ids JSONB DEFAULT '{}'::jsonb;
ALTER TABLE content ADD COLUMN IF NOT EXISTS agent_status TEXT DEFAULT 'pending';
-- agent_status values: pending, queued, publishing, published, failed

-- 2. Create publish_history table
CREATE TABLE IF NOT EXISTS publish_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES content(id) ON DELETE CASCADE,
  client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  post_id TEXT DEFAULT '',
  status TEXT NOT NULL,
  error_message TEXT DEFAULT '',
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Index for faster queries
CREATE INDEX IF NOT EXISTS idx_content_agent_status ON content(agent_status);
CREATE INDEX IF NOT EXISTS idx_content_status_approved ON content(status) WHERE status = 'Approved';
CREATE INDEX IF NOT EXISTS idx_publish_history_content ON publish_history(content_id);
CREATE INDEX IF NOT EXISTS idx_publish_history_client ON publish_history(client_id);

-- 4. RLS policies for publish_history
ALTER TABLE publish_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all publish history"
  ON publish_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert publish history"
  ON publish_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 5. Allow agent_status updates (service role bypasses RLS, but this is for safety)
CREATE POLICY "Allow agent status updates"
  ON content FOR UPDATE
  USING (true)
  WITH CHECK (true);
