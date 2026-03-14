-- Add new columns for Frame Customization
ALTER TABLE frames ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE frames ADD COLUMN IF NOT EXISTS style TEXT DEFAULT 'Custom';
ALTER TABLE frames ADD COLUMN IF NOT EXISTS rarity TEXT DEFAULT 'Common';

-- Policy update (if RLS is enabled, ensures only authorized users can update)
-- (Assuming existing RLS)
