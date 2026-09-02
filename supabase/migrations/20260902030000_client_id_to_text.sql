-- ============================================
-- Change client IDs from UUID to TEXT (S0100 format)
-- ============================================

-- Drop existing foreign key constraints
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS fk_profiles_client;
ALTER TABLE content DROP CONSTRAINT IF EXISTS content_client_id_fkey;
ALTER TABLE social_connections DROP CONSTRAINT IF EXISTS social_connections_client_id_fkey;

-- Drop indexes
DROP INDEX IF EXISTS idx_content_client_id;
DROP INDEX IF EXISTS idx_social_connections_client_id;

-- Create new clients table with TEXT id
CREATE TABLE clients_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Copy existing data (convert UUID to text)
INSERT INTO clients_new (id, name, active, created_at, updated_at)
SELECT id::text, name, active, created_at, updated_at FROM clients;

-- Drop old table and rename new
DROP TABLE clients;
ALTER TABLE clients_new RENAME TO clients;

-- Update profiles.client_id to TEXT
ALTER TABLE profiles DROP COLUMN IF EXISTS client_id;
ALTER TABLE profiles ADD COLUMN client_id TEXT;

-- Add foreign key from profiles to clients
ALTER TABLE profiles ADD CONSTRAINT fk_profiles_client
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

-- Update content.client_id to TEXT
ALTER TABLE content DROP COLUMN IF EXISTS client_id;
ALTER TABLE content ADD COLUMN client_id TEXT NOT NULL DEFAULT '';

-- Add foreign key from content to clients
ALTER TABLE content ADD CONSTRAINT fk_content_client
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- Update social_connections.client_id to TEXT
ALTER TABLE social_connections DROP COLUMN IF EXISTS client_id;
ALTER TABLE social_connections ADD COLUMN client_id TEXT NOT NULL DEFAULT '';

-- Add foreign key from social_connections to clients
ALTER TABLE social_connections ADD CONSTRAINT fk_social_connections_client
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- Recreate indexes
CREATE INDEX idx_content_client_id ON content(client_id);
CREATE INDEX idx_social_connections_client_id ON social_connections(client_id);

-- Recreate RLS policies for clients
DROP POLICY IF EXISTS "Admin full access on clients" ON clients;
DROP POLICY IF EXISTS "Client can view own client" ON clients;

CREATE POLICY "Admin full access on clients" ON clients
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Client can view own client" ON clients
  FOR SELECT USING (
    id = (SELECT client_id FROM profiles WHERE id = auth.uid())
  );

-- Recreate RLS policies for content
DROP POLICY IF EXISTS "Admin full access on content" ON content;
DROP POLICY IF EXISTS "Client can view own content" ON content;
DROP POLICY IF EXISTS "Client can insert own content" ON content;
DROP POLICY IF EXISTS "Client can update own content" ON content;
DROP POLICY IF EXISTS "Client can delete own content" ON content;

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

-- Recreate RLS policies for social_connections
DROP POLICY IF EXISTS "Admin full access on social_connections" ON social_connections;
DROP POLICY IF EXISTS "Client can view own social_connections" ON social_connections;
DROP POLICY IF EXISTS "Client can update own social_connections" ON social_connections;
DROP POLICY IF EXISTS "Client can insert own social_connections" ON social_connections;

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
