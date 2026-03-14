-- Add theme_id and audio_url columns to frames table
-- theme_id: controls which visual theme activates when this frame is selected
-- audio_url: background music URL (YouTube, Spotify, or direct link)

ALTER TABLE frames ADD COLUMN IF NOT EXISTS theme_id TEXT DEFAULT 'default';
ALTER TABLE frames ADD COLUMN IF NOT EXISTS audio_url TEXT DEFAULT NULL;
-- animation_type: visual effect that plays when this frame is selected
-- Options: 'none', 'confetti', 'hearts', 'sparkles', 'snow', 'stars', 'fireworks'
ALTER TABLE frames ADD COLUMN IF NOT EXISTS animation_type TEXT DEFAULT 'none';
