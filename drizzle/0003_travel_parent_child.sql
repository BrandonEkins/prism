-- Add parent-child relationship to travel_pins
-- Enables stops and national park sub-pins linked to a parent location

ALTER TABLE travel_pins ADD COLUMN IF NOT EXISTS parent_id uuid;
ALTER TABLE travel_pins ADD COLUMN IF NOT EXISTS pin_type varchar(20) NOT NULL DEFAULT 'location';

-- FK must be added after column exists (self-referential)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'travel_pins' AND constraint_name = 'travel_pins_parent_id_fkey'
  ) THEN
    ALTER TABLE travel_pins
      ADD CONSTRAINT travel_pins_parent_id_fkey
      FOREIGN KEY (parent_id) REFERENCES travel_pins(id) ON DELETE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS travel_pins_parent_id_idx ON travel_pins(parent_id);
