-- ============================================
-- SECURITY FIX: Lock Down Licenses Table
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Drop the old permissive RLS policy
-- (The old policy allowed anyone with anon key to SELECT all licenses)
DROP POLICY IF EXISTS "Allow public license validation" ON licenses;

-- Step 2: Create restrictive policy — block ALL direct access from anon role
-- License validation now goes through the server-side Cloudflare Function
-- which uses service_role key (bypasses RLS entirely)
CREATE POLICY "deny_anon_direct_access" ON licenses
  FOR ALL
  TO anon
  USING (false);

-- Step 3: Ensure RLS is enabled (idempotent)
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;

-- Step 4: Service role (used by Cloudflare Function) bypasses RLS automatically
-- No additional policy needed for service_role

-- ============================================
-- OPTIONAL: Add rate limiting tracking column
-- (for future use with server-side rate limiting via KV/DB)
-- ============================================
-- ALTER TABLE licenses ADD COLUMN IF NOT EXISTS last_validated_at TIMESTAMPTZ;
-- ALTER TABLE licenses ADD COLUMN IF NOT EXISTS validation_count INTEGER DEFAULT 0;
