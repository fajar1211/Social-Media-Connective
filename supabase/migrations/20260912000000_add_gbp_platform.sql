-- Add Google Business Profile platform
INSERT INTO platforms (name, enabled, types) VALUES
  ('GBP', true, '["Text Post", "Image", "Short Video"]'::jsonb)
ON CONFLICT (name) DO NOTHING;
