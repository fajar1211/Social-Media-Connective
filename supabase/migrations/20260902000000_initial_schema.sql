-- ============================================
-- Social Media Connective - Database Schema
-- Phase 1: Multi-Tenant Access Control
-- ============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
CREATE TYPE user_role AS ENUM ('admin', 'client');

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT DEFAULT '',
  role user_role NOT NULL DEFAULT 'client',
  client_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. CLIENTS TABLE
-- ============================================
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key from profiles to clients
ALTER TABLE profiles ADD CONSTRAINT fk_profiles_client
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

-- ============================================
-- 3. PLATFORMS TABLE
-- ============================================
CREATE TABLE platforms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT true,
  types JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. CONTENT TABLE
-- ============================================
CREATE TYPE content_status AS ENUM ('Suggested', 'Additional', 'Submitted', 'Approved', 'Deleted');

CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  caption TEXT DEFAULT '',
  body TEXT DEFAULT '',
  platform TEXT NOT NULL DEFAULT 'Facebook',
  type TEXT NOT NULL DEFAULT 'Image',
  status content_status NOT NULL DEFAULT 'Suggested',
  hashtags JSONB DEFAULT '[]'::jsonb,
  cta TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  media JSONB DEFAULT '[]'::jsonb,
  date DATE DEFAULT CURRENT_DATE,
  previous_status content_status,
  timezone TEXT DEFAULT '',
  scheduled_date DATE,
  scheduled_time TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_content_client_id ON content(client_id);
CREATE INDEX idx_content_status ON content(status);

-- ============================================
-- 5. SOCIAL_CONNECTIONS TABLE
-- ============================================
CREATE TABLE social_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  connected BOOLEAN DEFAULT false,
  account_name TEXT DEFAULT '',
  account_id TEXT DEFAULT '',
  access_token TEXT DEFAULT '',
  token_expires_in INTEGER DEFAULT 0,
  pages JSONB DEFAULT '[]'::jsonb,
  selected_business_id TEXT DEFAULT '',
  selected_business_name TEXT DEFAULT '',
  selected_page_id TEXT DEFAULT '',
  selected_page_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, platform)
);

CREATE INDEX idx_social_connections_client_id ON social_connections(client_id);

-- ============================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admin can view all profiles
CREATE POLICY "Admin can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin can insert profiles
CREATE POLICY "Admin can insert profiles" ON profiles
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin can update all profiles
CREATE POLICY "Admin can update all profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin can delete profiles
CREATE POLICY "Admin can delete profiles" ON profiles
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- CLIENTS POLICIES
-- ============================================

-- Admin can do everything with clients
CREATE POLICY "Admin full access on clients" ON clients
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Client can view their own client record
CREATE POLICY "Client can view own client" ON clients
  FOR SELECT USING (
    id = (SELECT client_id FROM profiles WHERE id = auth.uid())
  );

-- ============================================
-- CONTENT POLICIES
-- ============================================

-- Admin can do everything with content
CREATE POLICY "Admin full access on content" ON content
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Client can only view their own content
CREATE POLICY "Client can view own content" ON content
  FOR SELECT USING (
    client_id = (SELECT client_id FROM profiles WHERE id = auth.uid())
  );

-- Client can insert their own content
CREATE POLICY "Client can insert own content" ON content
  FOR INSERT WITH CHECK (
    client_id = (SELECT client_id FROM profiles WHERE id = auth.uid())
  );

-- Client can update their own content
CREATE POLICY "Client can update own content" ON content
  FOR UPDATE USING (
    client_id = (SELECT client_id FROM profiles WHERE id = auth.uid())
  );

-- Client can delete their own content
CREATE POLICY "Client can delete own content" ON content
  FOR DELETE USING (
    client_id = (SELECT client_id FROM profiles WHERE id = auth.uid())
  );

-- ============================================
-- SOCIAL_CONNECTIONS POLICIES
-- ============================================

-- Admin can do everything with social connections
CREATE POLICY "Admin full access on social_connections" ON social_connections
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Client can view their own social connections
CREATE POLICY "Client can view own social_connections" ON social_connections
  FOR SELECT USING (
    client_id = (SELECT client_id FROM profiles WHERE id = auth.uid())
  );

-- Client can update their own social connections
CREATE POLICY "Client can update own social_connections" ON social_connections
  FOR UPDATE USING (
    client_id = (SELECT client_id FROM profiles WHERE id = auth.uid())
  );

-- Client can insert their own social connections
CREATE POLICY "Client can insert own social_connections" ON social_connections
  FOR INSERT WITH CHECK (
    client_id = (SELECT client_id FROM profiles WHERE id = auth.uid())
  );

-- ============================================
-- PLATFORMS POLICIES (read-only for everyone)
-- ============================================

CREATE POLICY "Authenticated users can view platforms" ON platforms
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can manage platforms" ON platforms
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_content_updated_at
  BEFORE UPDATE ON content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_social_connections_updated_at
  BEFORE UPDATE ON social_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SEED DATA (Optional - for testing)
-- ============================================

-- Insert default platforms
INSERT INTO platforms (name, enabled, types) VALUES
  ('Facebook', true, '["Text Post", "Image", "Carousel", "Short Video"]'::jsonb),
  ('Instagram', true, '["Image", "Carousel", "Short Video"]'::jsonb),
  ('X / Twitter', true, '["Text Post", "Image"]'::jsonb),
  ('LinkedIn', true, '["Text Post", "Image", "Blog Article"]'::jsonb),
  ('Blog', false, '["Blog Article"]'::jsonb)
ON CONFLICT (name) DO NOTHING;
