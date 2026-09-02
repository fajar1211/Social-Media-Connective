-- Add social_integrations JSONB column to clients table (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'social_integrations'
  ) THEN
    ALTER TABLE clients ADD COLUMN social_integrations JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;
