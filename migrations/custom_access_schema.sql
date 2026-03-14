-- =====================================================
-- CUSTOM FRAME ACCESS & LETTERS SCHEMA
-- Feature: Restrict frames to specific emails & "Sepucuk Surat"
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Create 'admins' table for centralized access control
CREATE TABLE IF NOT EXISTS admins (
    email TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial admin (Replace/Add as needed)
INSERT INTO admins (email) VALUES 
('nnvnxx.10@gmail.com'), 
('admin@sparklebooth.com')
ON CONFLICT (email) DO NOTHING;

-- Enable RLS on admins (Public read-only to check status, but write restricted)
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read admins" ON admins FOR SELECT USING (true);


-- 2. Modify 'frames' table to add 'allowed_emails'
-- Stores array of emails allowed to see this frame. NULL or Empty = Public.
ALTER TABLE frames ADD COLUMN IF NOT EXISTS allowed_emails TEXT[] DEFAULT NULL;

-- Enable RLS on frames if not already
ALTER TABLE frames ENABLE ROW LEVEL SECURITY;

-- Policy: Admin can see ALL frames
CREATE POLICY "Admins can view all frames" ON frames
    FOR SELECT
    USING (
        (SELECT COUNT(*) FROM admins WHERE email = auth.email()) > 0
    );

-- Policy: Admis can insert/update/delete all frames
CREATE POLICY "Admins can manage all frames" ON frames
    FOR ALL
    USING (
        (SELECT COUNT(*) FROM admins WHERE email = auth.email()) > 0
    );

-- Policy: Public/Users can view frames that are (Public OR Allowed for them)
-- Note: 'auth.email()' requires user to be logged in via Supabase Auth.
-- For completely public frames (no login required for guest users), we might need to adjust logic,
-- but the requirement says "Only user ... can see ... User lain ... tidak boleh".
-- Assuming "guest" users (not logged into Google) see only Public frames.
CREATE POLICY "Users can view public or allowed frames" ON frames
    FOR SELECT
    USING (
        allowed_emails IS NULL 
        OR allowed_emails = '{}'
        OR (auth.email() = ANY(allowed_emails))
    );


-- 3. Create 'letters' table for "Sepucuk Surat"
CREATE TABLE IF NOT EXISTS letters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL, -- Rich text / HTML
    is_active BOOLEAN DEFAULT true,
    allowed_emails TEXT[] NOT NULL, -- Target emails
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on letters
ALTER TABLE letters ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything on letters
CREATE POLICY "Admins full access letters" ON letters
    FOR ALL
    USING (
        (SELECT COUNT(*) FROM admins WHERE email = auth.email()) > 0
    );

-- Policy: Users can ONLY READ letters targeted to them AND are active
CREATE POLICY "Users read own letters" ON letters
    FOR SELECT
    USING (
        is_active = true
        AND (auth.email() = ANY(allowed_emails))
    );

-- 4. Auto-update timestamp

-- Create generic update function FIRST
CREATE OR REPLACE FUNCTION update_timestamp_generic()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Then create the trigger using it
DROP TRIGGER IF EXISTS trigger_letters_updated_at ON letters;
CREATE TRIGGER trigger_letters_updated_at
    BEFORE UPDATE ON letters
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp_generic();
