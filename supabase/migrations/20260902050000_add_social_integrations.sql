-- Add social_integrations JSONB column to clients table
ALTER TABLE clients ADD COLUMN social_integrations JSONB DEFAULT '{}'::jsonb;
