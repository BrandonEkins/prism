-- Weekend Ideas: places + visits tables

CREATE TABLE IF NOT EXISTS weekend_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  description text,
  latitude decimal(9,6),
  longitude decimal(10,6),
  place_name varchar(255),
  address varchar(500),
  url varchar(1000),
  status varchar(20) NOT NULL DEFAULT 'backlog',
  is_favorite boolean NOT NULL DEFAULT false,
  rating integer,
  notes text,
  tags jsonb NOT NULL DEFAULT '[]',
  source_provider varchar(20),
  source_id varchar(100),
  last_visited_date varchar(10),
  visit_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS weekend_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES weekend_places(id) ON DELETE CASCADE,
  visited_by uuid REFERENCES users(id) ON DELETE SET NULL,
  visited_on varchar(10) NOT NULL,
  rating integer,
  notes text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS weekend_places_status_idx ON weekend_places(status);
CREATE INDEX IF NOT EXISTS weekend_places_favorite_idx ON weekend_places(is_favorite);
CREATE INDEX IF NOT EXISTS weekend_places_last_visited_idx ON weekend_places(last_visited_date);
CREATE INDEX IF NOT EXISTS weekend_visits_place_id_idx ON weekend_visits(place_id, visited_on);
