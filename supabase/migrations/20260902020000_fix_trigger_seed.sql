-- ============================================
-- FIX 2: Trigger function + seed data
-- ============================================

-- Fix trigger: handle empty role value
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE 
      WHEN NEW.raw_user_meta_data->>'role' IN ('admin', 'client') 
      THEN (NEW.raw_user_meta_data->>'role')::user_role
      ELSE 'client'::user_role
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert seed data for platforms
INSERT INTO platforms (name, enabled, types) VALUES
  ('Facebook', true, '["Text Post", "Image", "Carousel", "Short Video"]'::jsonb),
  ('Instagram', true, '["Image", "Carousel", "Short Video"]'::jsonb),
  ('X / Twitter', true, '["Text Post", "Image"]'::jsonb),
  ('LinkedIn', true, '["Text Post", "Image", "Blog Article"]'::jsonb),
  ('Blog', false, '["Blog Article"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Fix platforms policy to allow anon/ authenticated reads during signup flow
DROP POLICY IF EXISTS "Authenticated users can view platforms" ON platforms;
CREATE POLICY "Authenticated users can view platforms" ON platforms
  FOR SELECT USING (true);

-- Also make social_connections admin policy use JWT
DROP POLICY IF EXISTS "Admin full access on social_connections" ON social_connections;
CREATE POLICY "Admin full access on social_connections" ON social_connections
  FOR ALL USING (
    coalesce(auth.jwt()->'user_metadata'->>'role', '') = 'admin'
    OR coalesce(auth.jwt()->'app_metadata'->>'role', '') = 'admin'
  );
