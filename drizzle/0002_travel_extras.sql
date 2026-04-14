-- Migration: Travel extras
-- Adds stops and national_parks columns to travel_pins

ALTER TABLE travel_pins ADD COLUMN IF NOT EXISTS stops jsonb NOT NULL DEFAULT '[]';
ALTER TABLE travel_pins ADD COLUMN IF NOT EXISTS national_parks jsonb NOT NULL DEFAULT '[]';
