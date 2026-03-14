-- Migration to add photo_messages column to letters table
ALTER TABLE letters ADD COLUMN IF NOT EXISTS photo_messages text[];
