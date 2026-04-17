-- Travel trips: groups route/loop/hub stops into a single journey record
CREATE TABLE IF NOT EXISTS travel_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  description text,
  trip_style varchar(20) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'want_to_go',
  is_bucket_list boolean NOT NULL DEFAULT false,
  color varchar(7),
  emoji varchar(10),
  visited_date date,
  visited_end_date date,
  year integer,
  member_ids jsonb NOT NULL DEFAULT '[]',
  tags jsonb NOT NULL DEFAULT '[]',
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS travel_trips_year_idx ON travel_trips(year);

-- Add trip membership columns to travel_pins
ALTER TABLE travel_pins ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES travel_trips(id) ON DELETE CASCADE;
ALTER TABLE travel_pins ADD COLUMN IF NOT EXISTS is_hub boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS travel_pins_trip_id_idx ON travel_pins(trip_id);
