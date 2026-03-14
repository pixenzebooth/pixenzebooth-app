-- ==========================================================
-- FIX SEPUCUK SURAT EMAIL CASE SENSITIVITY
-- ==========================================================

-- 1. Lowercase all existing emails in 'letters' table to ensure data consistency
UPDATE letters
SET allowed_emails = ARRAY(
    SELECT lower(x)
    FROM unnest(allowed_emails) AS x
);

-- 2. Lowercase all existing emails in 'admins' table
UPDATE admins
SET email = lower(email);

-- 3. Update RLS Policy for Letters to be Case-Insensitive
-- This ensures that even if 'User@Gmail.com' is saved, 'user@gmail.com' can see it.

DROP POLICY IF EXISTS "Users read own letters" ON letters;

CREATE POLICY "Users read own letters" ON letters
    FOR SELECT
    USING (
        is_active = true
        AND (
            EXISTS (
                SELECT 1 
                FROM unnest(allowed_emails) AS email 
                WHERE lower(email) = lower(auth.email())
            )
        )
    );

-- 4. Verify Admin Policy (Just in case)
DROP POLICY IF EXISTS "Admins full access letters" ON letters;

CREATE POLICY "Admins full access letters" ON letters
    FOR ALL
    USING (
        (SELECT COUNT(*) FROM admins WHERE lower(email) = lower(auth.email())) > 0
    );
