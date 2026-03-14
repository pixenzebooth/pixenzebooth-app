-- ==========================================
-- MASTER SECURITY FIX SCRIPT - PIXENZEBOOTH
-- ==========================================
-- Tanggal: 4 Februari 2026
-- Deskripsi: Menggabungkan semua patch keamanan (Critical, High, Medium)
-- Instruksi: Copy semua text di bawah ini dan jalankan di Supabase SQL Editor

BEGIN;

-- ----------------------------------------------------------------
-- 1. [CRITICAL] FIX RACE CONDITION ON CAMPAIGN
-- ----------------------------------------------------------------
-- Membuat atomic function untuk claim winner agar kuota tidak jebol

CREATE OR REPLACE FUNCTION claim_winner_slot(
    p_name TEXT,
    p_whatsapp TEXT,
    p_address TEXT,
    p_user_id UUID DEFAULT NULL,
    p_photo_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_remaining INT;
    v_max_winners INT;
    v_current_winners INT;
    v_new_winner_id UUID;
BEGIN
    -- Lock row untuk prevent concurrent access
    SELECT max_winners, current_winners 
    INTO v_max_winners, v_current_winners
    FROM campaign_settings 
    WHERE id = 1 
    FOR UPDATE;
    
    v_remaining := v_max_winners - v_current_winners;
    
    IF v_remaining <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Maaf, kuota sudah penuh!', 'remaining', 0);
    END IF;
    
    -- Insert winner
    INSERT INTO campaign_winners (name, whatsapp, address, user_id, photo_url, created_at)
    VALUES (p_name, p_whatsapp, p_address, p_user_id, p_photo_url, NOW())
    RETURNING id INTO v_new_winner_id;
    
    -- Increment counter atomik
    UPDATE campaign_settings 
    SET current_winners = current_winners + 1
    WHERE id = 1;
    
    RETURN jsonb_build_object('success', true, 'message', 'Selamat! Anda berhasil claim reward!', 'winner_id', v_new_winner_id, 'remaining', v_remaining - 1);
EXCEPTION
    WHEN OTHERS THEN
         RETURN jsonb_build_object('success', false, 'message', 'System Error', 'error', SQLERRM);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION claim_winner_slot TO authenticated;
GRANT EXECUTE ON FUNCTION claim_winner_slot TO anon;

-- Secure direct access (prevent bypass)
DROP POLICY IF EXISTS "Allow insert to campaign_winners" ON campaign_winners;
DROP POLICY IF EXISTS "Deny direct insert to campaign_winners" ON campaign_winners;
CREATE POLICY "Deny direct insert to campaign_winners" 
ON campaign_winners FOR INSERT WITH CHECK (false);

-- ----------------------------------------------------------------
-- 2. [HIGH] DYNAMIC ADMIN MANAGEMENT (NO HARDCODED EMAIL)
-- ----------------------------------------------------------------

-- Buat Tabel Admins
CREATE TABLE IF NOT EXISTS admins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Seed Admin Awal (Sesuaikan email ini jika perlu)
INSERT INTO admins (email) 
VALUES 
    ('nnvnxx.10@gmail.com'), 
    ('admin@sparklebooth.com')
ON CONFLICT (email) DO NOTHING;

-- Helper Function Check Admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
    SELECT EXISTS (SELECT 1 FROM admins WHERE email = auth.jwt() ->> 'email');
$$;

-- Update Policies untuk menggunakan is_admin()
DROP POLICY IF EXISTS "Admins can insert frames" ON frames;
CREATE POLICY "Admins can insert frames" ON frames FOR INSERT WITH CHECK ( is_admin() );

DROP POLICY IF EXISTS "Admins can update frames" ON frames;
CREATE POLICY "Admins can update frames" ON frames FOR UPDATE USING ( is_admin() );

DROP POLICY IF EXISTS "Admins can delete frames" ON frames;
CREATE POLICY "Admins can delete frames" ON frames FOR DELETE USING ( is_admin() );

-- History Policy Update
DROP POLICY IF EXISTS "Admins can view all history" ON history;
CREATE POLICY "Admins can view all history" ON history FOR SELECT USING ( is_admin() );

-- ----------------------------------------------------------------
-- 3. [MEDIUM] MESSAGES TABLE FOR CONTACT FORM
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID DEFAULT NULL
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Siapapun boleh kirim pesan
DROP POLICY IF EXISTS "Anyone can insert messages" ON messages;
CREATE POLICY "Anyone can insert messages" ON messages FOR INSERT WITH CHECK (true);

-- Hanya admin boleh baca pesan
DROP POLICY IF EXISTS "Admins can view messages" ON messages;
CREATE POLICY "Admins can view messages" ON messages FOR SELECT USING ( is_admin() );


COMMIT;
-- END OF SCRIPT
