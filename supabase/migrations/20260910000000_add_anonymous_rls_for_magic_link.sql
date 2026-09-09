-- ============================================
-- ADD: Anonymous RLS policies for magic link portal
-- The content & platforms tables had no anonymous access,
-- causing "This page didn't load" error on /client/$token
-- ============================================

-- Allow anonymous users to view content for clients with active magic links
CREATE POLICY "Anonymous can view content via magic link" ON content
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM clients
      WHERE magic_link_active = true AND active = true
    )
  );

-- Allow anonymous users to view platforms (read-only)
CREATE POLICY "Anonymous can view platforms" ON platforms
  FOR SELECT USING (true);
