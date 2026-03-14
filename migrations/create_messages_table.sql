-- FEATURE: Contact Messages
-- Jalankan script ini di Supabase SQL Editor

-- 1. Buat tabel messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID DEFAULT NULL -- Optional jika user login
);

-- 2. Aktifkan RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Siapapun (anon) boleh INSERT pesan (Kirim pesan)
DROP POLICY IF EXISTS "Anyone can insert messages" ON messages;
CREATE POLICY "Anyone can insert messages" 
ON messages FOR INSERT 
WITH CHECK (true);

-- 4. Policy: Hanya Admin boleh BACA pesan
-- (Menggunakan function is_admin() yang dibuat di secure_policies_v2.sql)
-- Jika belum jalankan v2, jalankan script v2 dulu.
DROP POLICY IF EXISTS "Admins can view messages" ON messages;
CREATE POLICY "Admins can view messages" 
ON messages FOR SELECT 
USING ( 
  -- Fallback check jika is_admin function belum ada
  (SELECT count(*) FROM admins WHERE email = auth.jwt() ->> 'email') > 0
);
