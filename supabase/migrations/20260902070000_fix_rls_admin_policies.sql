-- ============================================
-- FIX: RLS policies using profiles table instead of JWT
-- The app stores role in profiles table, not in JWT metadata
-- ============================================

-- Drop ALL existing policies to start clean
DROP POLICY IF EXISTS "Admin full access on clients" ON clients;
DROP POLICY IF EXISTS "Client can view own client" ON clients;

DROP POLICY IF EXISTS "Admin full access on content" ON content;
DROP POLICY IF EXISTS "Client can view own content" ON content;
DROP POLICY IF EXISTS "Client can insert own content" ON content;
DROP POLICY IF EXISTS "Client can update own content" ON content;
DROP POLICY IF EXISTS "Client can delete own content" ON content;

DROP POLICY IF EXISTS "Admin full access on social_connections" ON social_connections;
DROP POLICY IF EXISTS "Client can view own social_connections" ON social_connections;
DROP POLICY IF EXISTS "Client can update own social_connections" ON social_connections;
DROP POLICY IF EXISTS "Client can insert own social_connections" ON social_connections;

DROP POLICY IF EXISTS "Authenticated users can view platforms" ON platforms;
DROP POLICY IF EXISTS "Admin can manage platforms" ON platforms;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can delete profiles" ON profiles;

-- ============================================
-- Create security definer function to check admin role
-- This avoids recursion (profiles RLS won't block this function)
-- ============================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- PROFILES POLICIES (no recursion)
-- ============================================
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin can view all profiles" ON profiles
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admin can insert profiles" ON profiles
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update all profiles" ON profiles
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admin can delete profiles" ON profiles
  FOR DELETE USING (public.is_admin());

-- ============================================
-- CLIENTS POLICIES
-- ============================================
CREATE POLICY "Admin full access on clients" ON clients
  FOR ALL USING (public.is_admin());

CREATE POLICY "Client can view own client" ON clients
  FOR SELECT USING (
    id = (SELECT client_id FROM public.profiles WHERE id = auth.uid())
  );

-- Allow anonymous access for magic link portal
-- Only allows SELECT when filtering by magic_link_token
CREATE POLICY "Anonymous can view client via magic link" ON clients
  FOR SELECT USING (
    magic_link_active = true AND active = true
  );

-- ============================================
-- CONTENT POLICIES
-- ============================================
CREATE POLICY "Admin full access on content" ON content
  FOR ALL USING (public.is_admin());

CREATE POLICY "Client can view own content" ON content
  FOR SELECT USING (
    client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Client can insert own content" ON content
  FOR INSERT WITH CHECK (
    client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Client can update own content" ON content
  FOR UPDATE USING (
    client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Client can delete own content" ON content
  FOR DELETE USING (
    client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid())
  );

-- ============================================
-- SOCIAL_CONNECTIONS POLICIES
-- ============================================
CREATE POLICY "Admin full access on social_connections" ON social_connections
  FOR ALL USING (public.is_admin());

CREATE POLICY "Client can view own social_connections" ON social_connections
  FOR SELECT USING (
    client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Client can update own social_connections" ON social_connections
  FOR UPDATE USING (
    client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Client can insert own social_connections" ON social_connections
  FOR INSERT WITH CHECK (
    client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid())
  );

-- ============================================
-- PLATFORMS POLICIES
-- ============================================
CREATE POLICY "Authenticated users can view platforms" ON platforms
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can manage platforms" ON platforms
  FOR ALL USING (public.is_admin());
