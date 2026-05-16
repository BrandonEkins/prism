-- Kroger cart integration.
-- Adds a cached productId column to shopping_items (for the SKU-picker
-- "remember last pick" UX) and a per-user OAuth-tokens table.

ALTER TABLE shopping_items
  ADD COLUMN IF NOT EXISTS kroger_product_id VARCHAR(50);

CREATE TABLE IF NOT EXISTS user_kroger_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  preferred_location_id VARCHAR(50),
  preferred_location_name VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_kroger_connections_user_id_idx
  ON user_kroger_connections(user_id);
