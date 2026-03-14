-- =====================================================
-- USER FRAMES PERSONAL STORAGE SCHEMA
-- Fitur: Custom Frame Personal untuk pengguna Google Login
-- Jalankan script ini di Supabase SQL Editor
-- =====================================================

-- 1. Create user_frames table
CREATE TABLE IF NOT EXISTS user_frames (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    layout_config JSONB DEFAULT NULL, -- Array of { x, y, width, height, rotation }
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE user_frames ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies - PRIVATE PER USER
-- Policy: User hanya bisa melihat frame milik sendiri
CREATE POLICY "Users can view own frames" ON user_frames
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: User hanya bisa insert frame untuk diri sendiri
CREATE POLICY "Users can insert own frames" ON user_frames
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: User hanya bisa update frame milik sendiri
CREATE POLICY "Users can update own frames" ON user_frames
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: User hanya bisa delete frame milik sendiri
CREATE POLICY "Users can delete own frames" ON user_frames
    FOR DELETE USING (auth.uid() = user_id);

-- 4. Performance Index
CREATE INDEX IF NOT EXISTS idx_user_frames_user_id ON user_frames(user_id);
CREATE INDEX IF NOT EXISTS idx_user_frames_created_at ON user_frames(created_at DESC);

-- 5. Auto-update updated_at on changes
CREATE OR REPLACE FUNCTION update_user_frames_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_frames_updated_at
    BEFORE UPDATE ON user_frames
    FOR EACH ROW
    EXECUTE FUNCTION update_user_frames_updated_at();

-- =====================================================
-- STORAGE BUCKET SETUP (Manual via Supabase Dashboard)
-- =====================================================
-- 1. Go to Supabase Dashboard -> Storage -> New Bucket
-- 2. Bucket name: "user-frames"
-- 3. Public: NO (Private bucket)
-- 4. Add the following Storage policies:

-- Storage Policy untuk user-frames bucket:
-- (Jalankan ini di SQL Editor juga)

-- Allow users to upload files to their own folder
CREATE POLICY "Users can upload own frames" ON storage.objects
    FOR INSERT 
    WITH CHECK (
        bucket_id = 'user-frames' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Allow users to read their own files
CREATE POLICY "Users can read own frames" ON storage.objects
    FOR SELECT 
    USING (
        bucket_id = 'user-frames' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Allow users to delete their own files
CREATE POLICY "Users can delete own frames" ON storage.objects
    FOR DELETE 
    USING (
        bucket_id = 'user-frames' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Allow users to update their own files
CREATE POLICY "Users can update own frames" ON storage.objects
    FOR UPDATE 
    USING (
        bucket_id = 'user-frames' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- =====================================================
-- DONE! 
-- Sekarang Anda perlu membuat bucket "user-frames" secara manual
-- di Supabase Dashboard -> Storage -> New Bucket
-- =====================================================
