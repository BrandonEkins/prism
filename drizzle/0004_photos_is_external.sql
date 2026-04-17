-- Add is_external flag to photos for metadata-only camera-roll records
ALTER TABLE photos ADD COLUMN IF NOT EXISTS is_external boolean NOT NULL DEFAULT false;
