-- Migration: Travel Map feature
-- Adds travel_pins, travel_pin_photos tables
-- and latitude/longitude columns to photos table.

-- Add GPS coordinates to photos
ALTER TABLE photos ADD COLUMN IF NOT EXISTS latitude decimal(9,6);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS longitude decimal(10,6);

-- Travel pins (visited places, want-to-go, bucket list)
CREATE TABLE IF NOT EXISTS travel_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  description text,
  latitude decimal(9,6) NOT NULL,
  longitude decimal(10,6) NOT NULL,
  place_name varchar(255),
  status varchar(20) NOT NULL DEFAULT 'want_to_go',
  is_bucket_list boolean NOT NULL DEFAULT false,
  trip_label varchar(255),
  color varchar(7),
  visited_date date,
  visited_end_date date,
  year integer,
  tags jsonb NOT NULL DEFAULT '[]',
  photo_radius_km decimal(6,2) DEFAULT 50,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS travel_pins_status_idx ON travel_pins(status);
CREATE INDEX IF NOT EXISTS travel_pins_year_idx ON travel_pins(year);

-- Join table: pins ↔ photos
CREATE TABLE IF NOT EXISTS travel_pin_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_id uuid NOT NULL REFERENCES travel_pins(id) ON DELETE CASCADE,
  photo_id uuid NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  linked_manually boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT travel_pin_photos_pin_photo_key UNIQUE (pin_id, photo_id)
);

CREATE INDEX IF NOT EXISTS travel_pin_photos_pin_id_idx ON travel_pin_photos(pin_id);
CREATE INDEX IF NOT EXISTS travel_pin_photos_photo_id_idx ON travel_pin_photos(photo_id);
