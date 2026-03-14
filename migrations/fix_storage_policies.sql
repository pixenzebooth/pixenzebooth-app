-- =====================================================
-- STORAGE BUCKET POLICIES FIX
-- Jalankan di Supabase SQL Editor
-- =====================================================

-- PENTING: Pastikan bucket "user-frames" sudah dibuat di Dashboard
-- Supabase Dashboard -> Storage -> New Bucket -> "user-frames" (Private: Yes)

-- Hapus policy lama jika ada
DROP POLICY IF EXISTS "Users can upload own frames" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own frames" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own frames" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own frames" ON storage.objects;

-- Policy untuk UPLOAD - gunakan path checking dengan split_part
CREATE POLICY "Users can upload own frames" ON storage.objects
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        bucket_id = 'user-frames' 
        AND auth.uid()::text = (string_to_array(name, '/'))[1]
    );

-- Policy untuk READ/SELECT
CREATE POLICY "Users can read own frames" ON storage.objects
    FOR SELECT 
    TO authenticated
    USING (
        bucket_id = 'user-frames' 
        AND auth.uid()::text = (string_to_array(name, '/'))[1]
    );

-- Policy untuk DELETE
CREATE POLICY "Users can delete own frames" ON storage.objects
    FOR DELETE 
    TO authenticated
    USING (
        bucket_id = 'user-frames' 
        AND auth.uid()::text = (string_to_array(name, '/'))[1]
    );

-- Policy untuk UPDATE
CREATE POLICY "Users can update own frames" ON storage.objects
    FOR UPDATE 
    TO authenticated
    USING (
        bucket_id = 'user-frames' 
        AND auth.uid()::text = (string_to_array(name, '/'))[1]
    );

-- =====================================================
-- DONE! Coba upload lagi setelah menjalankan script ini
-- =====================================================
