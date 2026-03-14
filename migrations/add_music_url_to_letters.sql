-- ==========================================================
-- ADD MUSIC URL TO LETTERS
-- ==========================================================

-- 1. Add 'music_url' column to 'letters' table
-- This will store the raw YouTube or Spotify link (or any URL)
ALTER TABLE letters 
ADD COLUMN IF NOT EXISTS music_url TEXT DEFAULT NULL;

-- 2. Comment for documentation
COMMENT ON COLUMN letters.music_url IS 'Optional: YouTube or Spotify link to play when letter opens';
