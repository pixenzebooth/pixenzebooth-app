-- SECURITY UPDATE V2: Dynamic Admin Management
-- Tujuans: Menghapus hardcoded email di RLS policies
-- Jalankan script ini di Supabase SQL Editor

-- 1. Buat Tabel Admins
CREATE TABLE IF NOT EXISTS admins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Aktifkan RLS di tabel admins (Hanya super admin/service role yang bisa edit manual via dashboard dulu)
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- 3. Masukkan admin awal (GANTI dengan email Anda yang sebenarnya jika perlu)
INSERT INTO admins (email) 
VALUES 
    ('nnvnxx.10@gmail.com'), 
    ('admin@sparklebooth.com')
ON CONFLICT (email) DO NOTHING;

-- 4. Policy untuk membaca daftar admin (Hanya admin yang bisa baca daftar admin - recursive check dihindari dengan SECURITY DEFINER function atau simple check)
-- Kita buat helper function untuk cek admin agar lebih aman dan performant
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER -- Berjalan dengan privilege owner
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM admins WHERE email = auth.jwt() ->> 'email'
    );
$$;

-- 5. Update Policy FRAMES untuk menggunakan tabel admins
DROP POLICY IF EXISTS "Admins can insert frames" ON frames;
CREATE POLICY "Admins can insert frames" 
ON frames FOR INSERT 
WITH CHECK ( is_admin() );

DROP POLICY IF EXISTS "Admins can update frames" ON frames;
CREATE POLICY "Admins can update frames" 
ON frames FOR UPDATE 
USING ( is_admin() );

DROP POLICY IF EXISTS "Admins can delete frames" ON frames;
CREATE POLICY "Admins can delete frames" 
ON frames FOR DELETE 
USING ( is_admin() );

-- 6. Update Policy CUSTOMERS/HISTORY (Optional: Admin view all)
DROP POLICY IF EXISTS "Admins can view all history" ON history;
CREATE POLICY "Admins can view all history" 
ON history FOR SELECT 
USING ( is_admin() );

-- 7. Secure Anonymous Insert (Mitigasi Spam)
-- Kita batasi hanya user yang punya valid anon/auth JWT (sudah default sih),
-- tapi kita bisa tambah trigger validasi data jika perlu. 
-- Untuk sekarang, kita pastikan kolom vital tidak boleh NULL via table constraint (biasanya sudah).

ALTER TABLE history 
ALTER COLUMN created_at SET DEFAULT NOW(),
ALTER COLUMN user_id SET NOT NULL; -- Memaksa harus ada user_id (walau anon)

-- Selesai. Hardcoded email hilang dari Policy definition.
