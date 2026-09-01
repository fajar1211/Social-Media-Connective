-- ============================================
-- FIX: Infinite recursion in profiles policies
-- ============================================

-- Drop ALL existing policies on profiles to start clean
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can delete profiles" ON profiles;

-- Recreate policies using auth.jwt() to avoid recursion
-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admin can view all profiles (using JWT to avoid recursion)
CREATE POLICY "Admin can view all profiles" ON profiles
  FOR SELECT USING (
    coalesce(auth.jwt()->'user_metadata'->>'role', '') = 'admin'
    OR coalesce(auth.jwt()->'app_metadata'->>'role', '') = 'admin'
  );

-- Admin can insert profiles
CREATE POLICY "Admin can insert profiles" ON profiles
  FOR INSERT WITH CHECK (
    coalesce(auth.jwt()->'user_metadata'->>'role', '') = 'admin'
    OR coalesce(auth.jwt()->'app_metadata'->>'role', '') = 'admin'
  );

-- Admin can update all profiles
CREATE POLICY "Admin can update all profiles" ON profiles
  FOR UPDATE USING (
    coalesce(auth.jwt()->'user_metadata'->>'role', '') = 'admin'
    OR coalesce(auth.jwt()->'app_metadata'->>'role', '') = 'admin'
  );

-- Admin can delete profiles
CREATE POLICY "Admin can delete profiles" ON profiles
  FOR DELETE USING (
    coalesce(auth.jwt()->'user_metadata'->>'role', '') = 'admin'
    OR coalesce(auth.jwt()->'app_metadata'->>'role', '') = 'admin'
  );

-- ============================================
-- FIX: Also fix policies that reference profiles
-- ============================================

-- Drop and recreate client policies on clients
DROP POLICY IF EXISTS "Admin full access on clients" ON clients;
DROP POLICY IF EXISTS "Client can view own client" ON clients;

CREATE POLICY "Admin full access on clients" ON clients
  FOR ALL USING (
    coalesce(auth.jwt()->'user_metadata'->>'role', '') = 'admin'
    OR coalesce(auth.jwt()->'app_metadata'->>'role', '') = 'admin'
  );

CREATE POLICY "Client can view own client" ON clients
  FOR SELECT USING (
    id = (SELECT client_id FROM profiles WHERE id = auth.uid())
  );

-- Drop and recreate content policies
DROP POLICY IF EXISTS "Admin full access on content" ON content;
DROP POLICY IF EXISTS "Client can view own content" ON content;
DROP POLICY IF EXISTS "Client can insert own content" ON content;
DROP POLICY IF EXISTS "Client can update own content" ON content;
DROP POLICY IF EXISTS "Client can delete own content" ON content;

CREATE POLICY "Admin full access on content" ON content
  FOR ALL USING (
    coalesce(auth.jwt()->'user_metadata'->>'role', '') = 'admin'
    OR coalesce(auth.jwt()->'app_metadata'->>'role', '') = 'admin'
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

-- Drop and recreate social_connections policies
DROP POLICY IF EXISTS "Admin full access on social_connections" ON social_connections;
DROP POLICY IF EXISTS "Client can view own social_connections" ON social_connections;
DROP POLICY IF EXISTS "Client can update own social_connections" ON social_connections;
DROP POLICY IF EXISTS "Client can insert own social_connections" ON social_connections;

CREATE POLICY "Admin full access on social_connections" ON social_connections
  FOR ALL USING (
    coalesce(auth.jwt()->'user_metadata'->>'role', '') = 'admin'
    OR coalesce(auth.jwt()->'app_metadata'->>'role', '') = 'admin'
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

-- Drop and recreate platforms policies
DROP POLICY IF EXISTS "Authenticated users can view platforms" ON platforms;
DROP POLICY IF EXISTS "Admin can manage platforms" ON platforms;

CREATE POLICY "Authenticated users can view platforms" ON platforms
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can manage platforms" ON platforms
  FOR ALL USING (
    coalesce(auth.jwt()->'user_metadata'->>'role', '') = 'admin'
    OR coalesce(auth.jwt()->'app_metadata'->>'role', '') = 'admin'
  );
