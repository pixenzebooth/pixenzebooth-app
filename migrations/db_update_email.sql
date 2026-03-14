-- Add email column to history table if it doesn't exist
ALTER TABLE history 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add gdrive_link column to history table if it doesn't exist (for audit)
ALTER TABLE history 
ADD COLUMN IF NOT EXISTS gdrive_link TEXT;
