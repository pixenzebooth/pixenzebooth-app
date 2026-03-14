-- FIX: Race Condition pada Campaign Winner Submission
-- Jalankan script ini di Supabase SQL Editor
-- Tanggal: 2026-02-04

-- 1. Buat stored procedure dengan transaction untuk atomic operation
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
    -- Lock row untuk prevent race condition (FOR UPDATE)
    SELECT max_winners, current_winners 
    INTO v_max_winners, v_current_winners
    FROM campaign_settings 
    WHERE id = 1 
    FOR UPDATE;
    
    -- Hitung slot tersisa
    v_remaining := v_max_winners - v_current_winners;
    
    -- Jika tidak ada slot, tolak
    IF v_remaining <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Maaf, kuota sudah penuh!',
            'remaining', 0
        );
    END IF;
    
    -- Insert winner ke tabel
    INSERT INTO campaign_winners (name, whatsapp, address, user_id, photo_url, created_at)
    VALUES (p_name, p_whatsapp, p_address, p_user_id, p_photo_url, NOW())
    RETURNING id INTO v_new_winner_id;
    
    -- Increment counter secara atomic
    UPDATE campaign_settings 
    SET current_winners = current_winners + 1
    WHERE id = 1;
    
    -- Return success dengan info
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Selamat! Anda berhasil claim reward!',
        'winner_id', v_new_winner_id,
        'remaining', v_remaining - 1
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- Rollback otomatis terjadi, return error
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Terjadi kesalahan sistem. Silakan coba lagi.',
            'error', SQLERRM
        );
END;
$$;

-- 2. Grant execute permission untuk authenticated dan anon users
GRANT EXECUTE ON FUNCTION claim_winner_slot TO authenticated;
GRANT EXECUTE ON FUNCTION claim_winner_slot TO anon;

-- 3. Tambahkan RLS policy untuk campaign_winners agar hanya bisa insert via function
-- Revoke direct insert permission
DROP POLICY IF EXISTS "Allow insert to campaign_winners" ON campaign_winners;
CREATE POLICY "Deny direct insert to campaign_winners" 
ON campaign_winners FOR INSERT 
WITH CHECK (false);

-- Function dengan SECURITY DEFINER akan bypass RLS

-- 4. Tambahkan index untuk performance
CREATE INDEX IF NOT EXISTS idx_campaign_winners_created_at 
ON campaign_winners(created_at DESC);

-- 5. Verifikasi function dibuat dengan benar
SELECT proname, prosecdef FROM pg_proc WHERE proname = 'claim_winner_slot';
