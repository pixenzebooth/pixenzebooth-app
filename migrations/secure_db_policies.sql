-- ============================================================
-- SECURITY UPDATE: Multi-Tenant RLS Policies
-- Run this script in your Supabase SQL Editor
-- ============================================================

-- 1. Enable Row Level Security on the FRAMES table
ALTER TABLE frames ENABLE ROW LEVEL SECURITY;

-- 2. Allow ANYONE (including anonymous/guests) to VIEW frames
-- This is essential for the Frame Selection page to work
DROP POLICY IF EXISTS "Public frames are viewable by everyone" ON frames;
CREATE POLICY "Public frames are viewable by everyone" 
ON frames FOR SELECT 
USING (true);

-- 3. Restrict INSERT (Add New Frame) to Tenant Owners/Admins
DROP POLICY IF EXISTS "Admins can insert frames" ON frames;
CREATE POLICY "Admins can insert frames" 
ON frames FOR INSERT 
WITH CHECK (
  (is_superadmin() AND tenant_id IS NULL) -- superadmins can add global frames
  OR (tenant_id = get_my_tenant_id())     -- others must add to their own tenant
);

-- 4. Restrict UPDATE (Edit Frame) to Tenant Owners/Admins (own tenant frames only)
DROP POLICY IF EXISTS "Admins can update frames" ON frames;
CREATE POLICY "Admins can update frames" 
ON frames FOR UPDATE 
USING (
  is_superadmin()                         -- superadmins can update anything
  OR tenant_id = get_my_tenant_id()       -- others only their own
);

-- 5. Restrict DELETE (Remove Frame) to Tenant Owners/Admins (own tenant frames only)
DROP POLICY IF EXISTS "Admins can delete frames" ON frames;
CREATE POLICY "Admins can delete frames" 
ON frames FOR DELETE 
USING (
  is_superadmin()                         -- superadmins can delete anything
  OR tenant_id = get_my_tenant_id()       -- others only their own
);

-- NOTE: The legacy 'history' table no longer exists in the SaaS schema.
-- If you need per-user history tracking, create the table first via saas_schema.sql.


-- ============================================================
-- 6. SUPERADMIN ACCESS POLICIES
-- ============================================================

-- Helper function to check superadmin status without causing infinite recursion in RLS
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM user_profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN coalesce(v_role = 'superadmin', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Allow superadmins to manage all tenants
DROP POLICY IF EXISTS "Superadmin can manage tenants" ON tenants;
CREATE POLICY "Superadmin can manage tenants"
ON tenants FOR ALL
USING (is_superadmin());

-- Allow superadmins to manage all subscriptions
DROP POLICY IF EXISTS "Superadmin can manage subscriptions" ON subscriptions;
CREATE POLICY "Superadmin can manage subscriptions"
ON subscriptions FOR ALL
USING (is_superadmin());

-- Allow superadmins to manage all user profiles
DROP POLICY IF EXISTS "Superadmin can manage user profiles" ON user_profiles;
CREATE POLICY "Superadmin can manage user profiles"
ON user_profiles FOR ALL
USING (is_superadmin());

-- Allow superadmins to manage all license tokens
DROP POLICY IF EXISTS "Superadmin can manage license tokens" ON license_tokens;
CREATE POLICY "Superadmin can manage license tokens"
ON license_tokens FOR ALL
USING (is_superadmin());
