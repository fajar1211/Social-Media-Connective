-- Add magic_link_token column to clients table
ALTER TABLE clients ADD COLUMN magic_link_token TEXT UNIQUE DEFAULT '';
ALTER TABLE clients ADD COLUMN magic_link_active BOOLEAN DEFAULT true;

-- Create index for fast token lookup
CREATE INDEX idx_clients_magic_link_token ON clients(magic_link_token) WHERE magic_link_token != '';
