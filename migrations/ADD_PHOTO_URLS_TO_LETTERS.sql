-- Adds photo_urls array column to the letters table
ALTER TABLE letters ADD COLUMN IF NOT EXISTS photo_urls text[] DEFAULT '{}';
