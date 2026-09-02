-- ============================================
-- Phase 1: Drop all dependent RLS policies
-- ============================================

-- Drop content policies that reference profiles.client_id
DROP POLICY IF EXISTS "Client can view own content" ON content;
DROP POLICY IF EXISTS "Client can insert own content" ON content;
DROP POLICY IF EXISTS "Client can update own content" ON content;
DROP POLICY IF EXISTS "Client can delete own content" ON content;

-- Drop social_connections policies that reference profiles.client_id
DROP POLICY IF EXISTS "Client can view own social_connections" ON social_connections;
DROP POLICY IF EXISTS "Client can update own social_connections" ON social_connections;
DROP POLICY IF EXISTS "Client can insert own social_connections" ON social_connections;

-- Drop clients policies
DROP POLICY IF EXISTS "Admin full access on clients" ON clients;
DROP POLICY IF EXISTS "Client can view own client" ON clients;

-- Drop content admin policy (will recreate)
DROP POLICY IF EXISTS "Admin full access on content" ON content;

-- Drop social_connections admin policy (will recreate)
DROP POLICY IF EXISTS "Admin full access on social_connections" ON social_connections;

-- ============================================
-- Phase 2: Drop FK constraints and indexes
-- ============================================

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS fk_profiles_client;
ALTER TABLE content DROP CONSTRAINT IF EXISTS content_client_id_fkey;
ALTER TABLE content DROP CONSTRAINT IF EXISTS fk_content_client;
ALTER TABLE social_connections DROP CONSTRAINT IF EXISTS social_connections_client_id_fkey;
ALTER TABLE social_connections DROP CONSTRAINT IF EXISTS fk_social_connections_client;

DROP INDEX IF EXISTS idx_content_client_id;
DROP INDEX IF EXISTS idx_social_connections_client_id;

-- ============================================
-- Phase 3: Alter profiles.client_id to TEXT
-- ============================================

ALTER TABLE profiles ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN client_id TYPE TEXT;

-- ============================================
-- Phase 4: Alter clients.id to TEXT
-- ============================================

-- Create temp table with TEXT id
CREATE TABLE clients_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO clients_new (id, name, active, created_at, updated_at)
SELECT id::text, name, active, created_at, updated_at FROM clients;

DROP TABLE clients;
ALTER TABLE clients_new RENAME TO clients;

-- ============================================
-- Phase 5: Alter content.client_id to TEXT
-- ============================================

ALTER TABLE content ALTER COLUMN client_id TYPE TEXT USING client_id::text;
ALTER TABLE content ALTER COLUMN client_id SET DEFAULT '';

-- ============================================
-- Phase 6: Alter social_connections.client_id to TEXT
-- ============================================

ALTER TABLE social_connections ALTER COLUMN client_id TYPE TEXT USING client_id::text;
ALTER TABLE social_connections ALTER COLUMN client_id SET DEFAULT '';

-- ============================================
-- Phase 7: Recreate FK constraints
-- ============================================

ALTER TABLE profiles ADD CONSTRAINT fk_profiles_client
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

ALTER TABLE content ADD CONSTRAINT fk_content_client
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

ALTER TABLE social_connections ADD CONSTRAINT fk_social_connections_client
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- ============================================
-- Phase 8: Recreate indexes
-- ============================================

CREATE INDEX idx_content_client_id ON content(client_id);
CREATE INDEX idx_social_connections_client_id ON social_connections(client_id);

-- ============================================
-- Phase 9: Recreate ALL RLS policies
-- ============================================

-- Clients policies
CREATE POLICY "Admin full access on clients" ON clients
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Client can view own client" ON clients
  FOR SELECT USING (
    id = (SELECT client_id FROM profiles WHERE id = auth.uid())
  );

-- Content policies
CREATE POLICY "Admin full access on content" ON content
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Client can view own content" ON content
  FOR SELECT USING (
    client_id = (SELECT client_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY "Client can insert own content" ON content
  FOR INSERT WITH CHECK (
    client_id = (SELECT client_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY "Client can update own content" ON content
  FOR UPDATE USING (
    client_id = (SELECT client_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY "Client can delete own content" ON content
  FOR DELETE USING (
    client_id = (SELECT client_id FROM profiles WHERE id = auth.uid())
  );

-- Social connections policies
CREATE POLICY "Admin full access on social_connections" ON social_connections
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Client can view own social_connections" ON social_connections
  FOR SELECT USING (
    client_id = (SELECT client_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY "Client can update own social_connections" ON social_connections
  FOR UPDATE USING (
    client_id = (SELECT client_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY "Client can insert own social_connections" ON social_connections
  FOR INSERT WITH CHECK (
    client_id = (SELECT client_id FROM profiles WHERE id = auth.uid())
  );
