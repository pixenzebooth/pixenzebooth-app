-- =====================================================================
-- PixenzeBooth — Multi-Tenant SaaS Database Schema (COMPLETE)
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- =====================================================================
-- Target: FRESH Supabase project
-- This file is self-contained — everything needed in one file.
-- =====================================================================


-- =====================================================================
-- NUCLEAR PERMISSION RESET (Fixes 406/401 Errors)
-- =====================================================================
DO $$ 
BEGIN
    -- Grant usage on public schema
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    
    -- Grant select on all existing tables
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
    
    -- Ensure default privileges for future tables
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
    
    -- Fix search path for the API role
    EXECUTE 'ALTER ROLE authenticator SET search_path TO public, auth, storage';
END $$;

-- ========================
-- UTILITY FUNCTIONS
-- ========================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Get the tenant ID for the current authenticated user (bypasses RLS)
CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS UUID AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM user_profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;


-- ========================
-- 1. TENANTS
-- ========================
CREATE TABLE IF NOT EXISTS tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Ensure columns exist
DO $$ BEGIN
  ALTER TABLE tenants ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE tenants ADD COLUMN IF NOT EXISTS name TEXT;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
EXCEPTION WHEN others THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants (slug);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Public can read tenant info (needed for subdomain resolution)
DROP POLICY IF EXISTS "tenants_public_read" ON tenants;
CREATE POLICY "tenants_public_read"
  ON tenants FOR SELECT
  USING (is_active = true);

-- Only service_role can insert/update/delete tenants
DROP POLICY IF EXISTS "tenants_service_manage" ON tenants;
CREATE POLICY "tenants_service_manage"
  ON tenants FOR ALL
  USING (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS set_tenants_updated_at ON tenants;
CREATE TRIGGER set_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ========================
-- 2. USER PROFILES
-- ========================
CREATE TABLE IF NOT EXISTS user_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
  role        TEXT DEFAULT 'operator',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Ensure columns exist
DO $$ BEGIN
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'operator';
EXCEPTION WHEN others THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant ON user_profiles (tenant_id);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
DROP POLICY IF EXISTS "user_profiles_read_own" ON user_profiles;
CREATE POLICY "user_profiles_read_own"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

-- Users can read profiles within their tenant (for admin panels)
DROP POLICY IF EXISTS "user_profiles_read_tenant" ON user_profiles;
CREATE POLICY "user_profiles_read_tenant"
  ON user_profiles FOR SELECT
  USING (tenant_id = get_my_tenant_id());

-- Only service_role can insert (done during signup flow)
DROP POLICY IF EXISTS "user_profiles_service_insert" ON user_profiles;
CREATE POLICY "user_profiles_service_insert"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Users can update their own profile (not tenant_id or role)
DROP POLICY IF EXISTS "user_profiles_update_own" ON user_profiles;
CREATE POLICY "user_profiles_update_own"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid());

DROP TRIGGER IF EXISTS set_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER set_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =====================================================================
-- AUTO-PROVISIONING (Trigger for new users & Retroactive Sync)
-- =====================================================================
-- 1. Create a function to automatically create a tenant and profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_tenant_id UUID;
  user_email TEXT;
BEGIN
  -- Get user email safely
  user_email := new.email;
  IF user_email IS NULL THEN
    user_email := new.id::TEXT || '@example.com';
  END IF;

  -- Create a new tenant for the user
  INSERT INTO public.tenants (slug, name)
  VALUES (
    'tenant-' || substr(new.id::text, 1, 8), 
    split_part(user_email, '@', 1) || '''s Booth'
  )
  RETURNING id INTO new_tenant_id;

  -- Create their profile as an owner
  INSERT INTO public.user_profiles (id, tenant_id, role)
  VALUES (new.id, new_tenant_id, 'owner');

  -- Create default tenant settings
  INSERT INTO public.tenant_settings (tenant_id)
  VALUES (new_tenant_id);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. RETROACTIVE SYNC: Fix existing users who logged in but have no profile/tenant/settings
DO $$ 
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN 
    SELECT u.id, u.email 
    FROM auth.users u
    LEFT JOIN public.user_profiles p ON u.id = p.id
    WHERE p.id IS NULL
  LOOP
    -- Manually trigger the provisioning logic for existing orphaned users
    DECLARE 
      t_id UUID;
      u_email TEXT := COALESCE(rec.email, rec.id::TEXT || '@example.com');
    BEGIN
      INSERT INTO public.tenants (slug, name)
      VALUES (
        'tenant-' || substr(rec.id::text, 1, 8), 
        split_part(u_email, '@', 1) || '''s Booth'
      ) RETURNING id INTO t_id;

      INSERT INTO public.user_profiles (id, tenant_id, role)
      VALUES (rec.id, t_id, 'owner');
      
      INSERT INTO public.tenant_settings (tenant_id)
      VALUES (t_id) ON CONFLICT DO NOTHING;
    END;
  END LOOP;

  -- Fix existing tenants that are missing tenant_settings
  INSERT INTO public.tenant_settings (tenant_id)
  SELECT id FROM public.tenants
  ON CONFLICT DO NOTHING;
END $$;


-- ========================
-- 3. SUBSCRIPTIONS
-- ========================
CREATE TABLE IF NOT EXISTS subscriptions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan           TEXT NOT NULL DEFAULT 'free',
  device_limit   INTEGER NOT NULL DEFAULT 1,
  event_limit    INTEGER NOT NULL DEFAULT 5,
  storage_limit  INTEGER NOT NULL DEFAULT 500,
  status         TEXT NOT NULL DEFAULT 'active',
  expires_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- Ensure columns exist
DO $$ BEGIN
  ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
  ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS device_limit INTEGER DEFAULT 1;
  ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS event_limit INTEGER DEFAULT 5;
  ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS storage_limit INTEGER DEFAULT 500;
  ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
EXCEPTION WHEN others THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions (tenant_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Tenant members can read their own subscription
DROP POLICY IF EXISTS "subscriptions_read_tenant" ON subscriptions;
CREATE POLICY "subscriptions_read_tenant"
  ON subscriptions FOR SELECT
  USING (tenant_id = get_my_tenant_id());

-- Only service_role can manage subscriptions (billing backend)
DROP POLICY IF EXISTS "subscriptions_service_manage" ON subscriptions;
CREATE POLICY "subscriptions_service_manage"
  ON subscriptions FOR ALL
  USING (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS set_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ========================
-- 3.5 LICENSE TOKENS
-- ========================
CREATE TABLE IF NOT EXISTS license_tokens (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  token          TEXT NOT NULL UNIQUE,
  status         TEXT NOT NULL DEFAULT 'active',
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- Ensure columns exist
DO $$ BEGIN
  ALTER TABLE license_tokens ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
EXCEPTION WHEN others THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_license_tokens_tenant ON license_tokens (tenant_id);
CREATE INDEX IF NOT EXISTS idx_license_tokens_token ON license_tokens (token);

ALTER TABLE license_tokens ENABLE ROW LEVEL SECURITY;

-- Public can read active tokens (needed to validate on login)
DROP POLICY IF EXISTS "license_tokens_public_read" ON license_tokens;
CREATE POLICY "license_tokens_public_read"
  ON license_tokens FOR SELECT
  USING (status = 'active');

-- Tenant members can manage their tokens
DROP POLICY IF EXISTS "license_tokens_manage_tenant" ON license_tokens;
CREATE POLICY "license_tokens_manage_tenant"
  ON license_tokens FOR ALL
  USING (tenant_id = get_my_tenant_id());

DROP TRIGGER IF EXISTS set_license_tokens_updated_at ON license_tokens;
CREATE TRIGGER set_license_tokens_updated_at
  BEFORE UPDATE ON license_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ========================
-- 4. DEVICES
-- ========================
CREATE TABLE IF NOT EXISTS devices (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  device_name  TEXT NOT NULL,
  hardware_id  TEXT,
  status       TEXT NOT NULL DEFAULT 'inactive',
  last_seen_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- Ensure columns exist
DO $$ BEGIN
  ALTER TABLE devices ADD COLUMN IF NOT EXISTS hardware_id TEXT;
  ALTER TABLE devices ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'inactive';
EXCEPTION WHEN others THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_devices_tenant ON devices (tenant_id);
CREATE INDEX IF NOT EXISTS idx_devices_hardware ON devices (hardware_id);

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

-- Tenant members can read their devices
DROP POLICY IF EXISTS "devices_read_tenant" ON devices;
CREATE POLICY "devices_read_tenant"
  ON devices FOR SELECT
  USING (tenant_id = get_my_tenant_id());

-- Tenant members can manage devices
DROP POLICY IF EXISTS "devices_manage_tenant" ON devices;
CREATE POLICY "devices_manage_tenant"
  ON devices FOR INSERT
  WITH CHECK (tenant_id = get_my_tenant_id());

DROP POLICY IF EXISTS "devices_update_tenant" ON devices;
CREATE POLICY "devices_update_tenant"
  ON devices FOR UPDATE
  USING (tenant_id = get_my_tenant_id());

DROP POLICY IF EXISTS "devices_delete_tenant" ON devices;
CREATE POLICY "devices_delete_tenant"
  ON devices FOR DELETE
  USING (tenant_id = get_my_tenant_id());

-- Service role can also manage (for authenticate-device API)
DROP POLICY IF EXISTS "devices_service_manage" ON devices;
CREATE POLICY "devices_service_manage"
  ON devices FOR ALL
  USING (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS set_devices_updated_at ON devices;
CREATE TRIGGER set_devices_updated_at
  BEFORE UPDATE ON devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ========================
-- 5. EVENTS
-- ========================
CREATE TABLE IF NOT EXISTS events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_name   TEXT NOT NULL,
  event_date   DATE,
  slug         TEXT NOT NULL,
  description  TEXT,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE (tenant_id, slug)
);

-- Ensure columns exist
DO $$ BEGIN
  ALTER TABLE events ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
EXCEPTION WHEN others THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_events_tenant ON events (tenant_id);
CREATE INDEX IF NOT EXISTS idx_events_slug ON events (slug);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Public can read active events (needed for gallery pages)
DROP POLICY IF EXISTS "events_public_read" ON events;
CREATE POLICY "events_public_read"
  ON events FOR SELECT
  USING (is_active = true);

-- Tenant members can manage their events
DROP POLICY IF EXISTS "events_manage_tenant" ON events;
CREATE POLICY "events_manage_tenant"
  ON events FOR INSERT
  WITH CHECK (tenant_id = get_my_tenant_id());

DROP POLICY IF EXISTS "events_update_tenant" ON events;
CREATE POLICY "events_update_tenant"
  ON events FOR UPDATE
  USING (tenant_id = get_my_tenant_id());

DROP POLICY IF EXISTS "events_delete_tenant" ON events;
CREATE POLICY "events_delete_tenant"
  ON events FOR DELETE
  USING (tenant_id = get_my_tenant_id());

-- Service role can manage events (for API endpoints)
DROP POLICY IF EXISTS "events_service_manage" ON events;
CREATE POLICY "events_service_manage"
  ON events FOR ALL
  USING (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS set_events_updated_at ON events;
CREATE TRIGGER set_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ========================
-- 6. FRAMES
-- ========================
CREATE TABLE IF NOT EXISTS frames (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  image_url       TEXT NOT NULL,
  thumbnail_url   TEXT,
  layout_config   JSONB DEFAULT NULL,
  category        TEXT DEFAULT 'general',
  status          TEXT DEFAULT 'active',
  is_active       BOOLEAN DEFAULT true,
  is_premium      BOOLEAN DEFAULT false,
  is_exclusive    BOOLEAN DEFAULT false,
  sort_order      INTEGER DEFAULT 0,
  style           TEXT DEFAULT 'Custom',
  rarity          TEXT DEFAULT 'common',
  artist          TEXT DEFAULT 'System',
  allowed_emails  TEXT[] DEFAULT '{}',
  theme_id        TEXT,
  audio_url       TEXT,
  animation_type  TEXT,
  type            TEXT DEFAULT 'standard',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- FORCE SYNC COLUMNS (Crucial if table existed)
DO $$ BEGIN
  ALTER TABLE frames ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
  ALTER TABLE frames ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
  ALTER TABLE frames ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
  ALTER TABLE frames ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;
  ALTER TABLE frames ADD COLUMN IF NOT EXISTS is_exclusive BOOLEAN DEFAULT false;
  ALTER TABLE frames ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
  ALTER TABLE frames ADD COLUMN IF NOT EXISTS style TEXT DEFAULT 'Custom';
  ALTER TABLE frames ADD COLUMN IF NOT EXISTS rarity TEXT DEFAULT 'common';
  ALTER TABLE frames ADD COLUMN IF NOT EXISTS artist TEXT DEFAULT 'System';
  ALTER TABLE frames ADD COLUMN IF NOT EXISTS allowed_emails TEXT[] DEFAULT '{}';
  ALTER TABLE frames ADD COLUMN IF NOT EXISTS theme_id TEXT;
  ALTER TABLE frames ADD COLUMN IF NOT EXISTS audio_url TEXT;
  ALTER TABLE frames ADD COLUMN IF NOT EXISTS animation_type TEXT;
  ALTER TABLE frames ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'standard';
  ALTER TABLE frames ADD COLUMN IF NOT EXISTS layout_config JSONB DEFAULT NULL;
  ALTER TABLE frames ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
EXCEPTION WHEN others THEN NULL; END $$;


CREATE INDEX IF NOT EXISTS idx_frames_tenant ON frames (tenant_id);

ALTER TABLE frames ENABLE ROW LEVEL SECURITY;

-- Public read for active frames (device needs to load frames)
DROP POLICY IF EXISTS "frames_public_active" ON frames;
CREATE POLICY "frames_public_active"
  ON frames FOR SELECT
  USING (
    is_active = true 
    OR is_active IS NULL 
    OR status = 'active' 
    OR status = 'coming_soon'
  );

-- Tenant admins can manage their frames
DROP POLICY IF EXISTS "frames_insert_tenant" ON frames;
CREATE POLICY "frames_insert_tenant"
  ON frames FOR INSERT
  WITH CHECK (
    tenant_id IS NULL  -- allow legacy global frames
    OR tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "frames_update_tenant" ON frames;
CREATE POLICY "frames_update_tenant"
  ON frames FOR UPDATE
  USING (
    tenant_id IS NULL
    OR tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "frames_delete_tenant" ON frames;
CREATE POLICY "frames_delete_tenant"
  ON frames FOR DELETE
  USING (
    tenant_id IS NULL
    OR tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
  );

DROP TRIGGER IF EXISTS set_frames_updated_at ON frames;
CREATE TRIGGER set_frames_updated_at
  BEFORE UPDATE ON frames
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ========================
-- 7. LUTS (Custom Filters)
-- LUT filter files for photo effects
-- Referenced by FilterManager.jsx
-- ========================
CREATE TABLE IF NOT EXISTS luts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,  -- NULL = global filters
  name         TEXT NOT NULL,
  lut_url      TEXT NOT NULL,               -- URL to the .cube or PNG LUT file
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_luts_tenant ON luts (tenant_id);

ALTER TABLE luts ENABLE ROW LEVEL SECURITY;

-- Public read for active LUTs (device needs to load filters)
DROP POLICY IF EXISTS "luts_public_active" ON luts;
CREATE POLICY "luts_public_active"
  ON luts FOR SELECT
  USING (is_active = true);

-- Tenant admins can manage their LUTs
DROP POLICY IF EXISTS "luts_insert_tenant" ON luts;
CREATE POLICY "luts_insert_tenant"
  ON luts FOR INSERT
  WITH CHECK (
    tenant_id IS NULL
    OR tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "luts_update_tenant" ON luts;
CREATE POLICY "luts_update_tenant"
  ON luts FOR UPDATE
  USING (
    tenant_id IS NULL
    OR tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "luts_delete_tenant" ON luts;
CREATE POLICY "luts_delete_tenant"
  ON luts FOR DELETE
  USING (
    tenant_id IS NULL
    OR tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
  );

DROP TRIGGER IF EXISTS set_luts_updated_at ON luts;
CREATE TRIGGER set_luts_updated_at
  BEFORE UPDATE ON luts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ========================
-- 8. PHOTOS & STORAGE
-- Uploaded event photos stored in Supabase Storage
-- Storage path: photos/{tenant_id}/{event_id}/{photo_id}.jpg
-- ========================

-- Create the Storage Bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('photos', 'photos', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS Policies
DROP POLICY IF EXISTS "Photos are publicly accessible" ON storage.objects;
CREATE POLICY "Photos are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'photos');

DROP POLICY IF EXISTS "Anyone can upload photos" ON storage.objects;
CREATE POLICY "Anyone can upload photos"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'photos');

DROP POLICY IF EXISTS "Users can delete own tenant photos" ON storage.objects;
CREATE POLICY "Users can delete own tenant photos"
  ON storage.objects FOR DELETE
  TO public
  USING (bucket_id = 'photos');

-- Now the metadata table
CREATE TABLE IF NOT EXISTS photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID REFERENCES events(id) ON DELETE CASCADE,
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
  photo_url   TEXT NOT NULL,                   -- Supabase Storage public URL
  file_path   TEXT NOT NULL,                   -- Storage path for deletion
  file_size   INTEGER,                         -- in bytes, for quota tracking
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Force drop NOT NULL constraints if they existed previously (fixes 400 Bad Request error)
DO $$ BEGIN
  ALTER TABLE photos ALTER COLUMN event_id DROP NOT NULL;
  ALTER TABLE photos ALTER COLUMN tenant_id DROP NOT NULL;
EXCEPTION WHEN others THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_photos_event ON photos (event_id);
CREATE INDEX IF NOT EXISTS idx_photos_tenant ON photos (tenant_id);

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- ========================
-- 9. CAMPAIGN SETTINGS (Legacy)
-- ========================
CREATE TABLE IF NOT EXISTS campaign_settings (
  id           INTEGER PRIMARY KEY DEFAULT 1,
  is_active    BOOLEAN DEFAULT false,
  total_quota  INTEGER DEFAULT 100,
  used_quota   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE campaign_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign_settings_public_read" ON campaign_settings;
CREATE POLICY "campaign_settings_public_read" ON campaign_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "campaign_settings_manage" ON campaign_settings;
CREATE POLICY "campaign_settings_manage" ON campaign_settings FOR ALL USING (auth.role() = 'authenticated');

-- Ensure default row exists
INSERT INTO campaign_settings (id, is_active, total_quota, used_quota) 
VALUES (1, false, 100, 0) ON CONFLICT (id) DO NOTHING;

-- Public can read photos (gallery is public)
DROP POLICY IF EXISTS "photos_public_read" ON photos;
CREATE POLICY "photos_public_read"
  ON photos FOR SELECT
  USING (true);

-- Anyone can insert photos (from the photobooth front end)
DROP POLICY IF EXISTS "photos_insert_anyone" ON photos;
CREATE POLICY "photos_insert_anyone"
  ON photos FOR INSERT
  WITH CHECK (true);

-- Tenant admins can delete photos
DROP POLICY IF EXISTS "photos_delete_tenant" ON photos;
CREATE POLICY "photos_delete_tenant"
  ON photos FOR DELETE
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

-- Service role can manage photos (for API endpoints)
DROP POLICY IF EXISTS "photos_service_manage" ON photos;
CREATE POLICY "photos_service_manage"
  ON photos FOR ALL
  USING (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS set_photos_updated_at ON photos;
CREATE TRIGGER set_photos_updated_at
  BEFORE UPDATE ON photos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================
-- 10. TENANT SETTINGS
-- ========================
CREATE TABLE IF NOT EXISTS tenant_settings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  active_theme            TEXT DEFAULT 'default',
  primary_color           TEXT DEFAULT '#ef233c',
  secondary_color         TEXT DEFAULT '#face10',
  audio_url               TEXT,
  bg_image_url            TEXT,
  custom_logo_url         TEXT,
  payment_enabled         BOOLEAN DEFAULT false,
  payment_amount          INTEGER DEFAULT 15000,
  midtrans_client_key     TEXT,
  is_midtrans_production  BOOLEAN DEFAULT false,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

-- Public read for fetching themes
DROP POLICY IF EXISTS "tenant_settings_public_read" ON tenant_settings;
CREATE POLICY "tenant_settings_public_read"
  ON tenant_settings FOR SELECT
  USING (true);

-- Tenant admins can manage their settings
DROP POLICY IF EXISTS "tenant_settings_manage" ON tenant_settings;
CREATE POLICY "tenant_settings_manage"
  ON tenant_settings FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

DROP TRIGGER IF EXISTS set_tenant_settings_updated_at ON tenant_settings;
CREATE TRIGGER set_tenant_settings_updated_at
  BEFORE UPDATE ON tenant_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Merge columns from the old duplicate definition into the primary tenant_settings table
-- These columns existed in a second definition and may be missing from existing deployments
DO $$ BEGIN
  ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS app_name TEXT DEFAULT 'PixenzeBooth';
  ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS announcement_url TEXT DEFAULT '';
  ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '';  -- alias for custom_logo_url
EXCEPTION WHEN others THEN NULL; END $$;


-- ========================
-- 10. GLOBAL SETTINGS (Backward Compatibility)
-- ThemeContext.jsx and ThemeManager.jsx still reference this table.
-- Keeps the app working during incremental migration.
-- ========================
CREATE TABLE IF NOT EXISTS global_settings (
  id               INTEGER PRIMARY KEY DEFAULT 1,
  active_theme     TEXT DEFAULT 'default',
  primary_color    TEXT DEFAULT '#ef233c',
  secondary_color  TEXT DEFAULT '#face10',
  bg_image_url     TEXT DEFAULT '',
  custom_logo_url  TEXT DEFAULT '',
  audio_url        TEXT DEFAULT '',
  announcement_url TEXT DEFAULT '',
  payment_enabled  BOOLEAN DEFAULT false,
  payment_amount   INTEGER DEFAULT 15000,
  midtrans_client_key TEXT DEFAULT '',
  is_midtrans_production BOOLEAN DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Ensure columns exist if table was already there
DO $$ BEGIN ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS payment_enabled BOOLEAN DEFAULT false; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS payment_amount INTEGER DEFAULT 15000; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS midtrans_client_key TEXT DEFAULT ''; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS is_midtrans_production BOOLEAN DEFAULT false; EXCEPTION WHEN others THEN NULL; END $$;

ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "global_settings_public_read" ON global_settings;
CREATE POLICY "global_settings_public_read"
  ON global_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "global_settings_auth_update" ON global_settings;
CREATE POLICY "global_settings_auth_update"
  ON global_settings FOR UPDATE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "global_settings_auth_insert" ON global_settings;
CREATE POLICY "global_settings_auth_insert"
  ON global_settings FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP TRIGGER IF EXISTS set_global_settings_updated_at ON global_settings;
CREATE TRIGGER set_global_settings_updated_at
  BEFORE UPDATE ON global_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default row
INSERT INTO global_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;


-- ========================
-- 11. LETTERS (Love Letters / Popup Messages)
-- Used by ExclusivePopup component & LetterManager
-- ========================
CREATE TABLE IF NOT EXISTS letters (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  sender_name  TEXT NOT NULL DEFAULT 'Anonymous',
  message      TEXT NOT NULL,
  image_url    TEXT,
  is_read      BOOLEAN DEFAULT false,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_letters_tenant ON letters (tenant_id);

ALTER TABLE letters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "letters_public_read" ON letters;
CREATE POLICY "letters_public_read"
  ON letters FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "letters_auth_insert" ON letters;
CREATE POLICY "letters_auth_insert"
  ON letters FOR INSERT
  WITH CHECK (true);  -- anyone can send a letter

DROP POLICY IF EXISTS "letters_auth_update" ON letters;
CREATE POLICY "letters_auth_update"
  ON letters FOR UPDATE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "letters_auth_delete" ON letters;
CREATE POLICY "letters_auth_delete"
  ON letters FOR DELETE
  USING (auth.role() = 'authenticated');


-- =====================================================================
-- ENABLE REALTIME
-- =====================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Handle tables if not already in publication
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE photos;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE tenant_settings;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE events;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE global_settings;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE frames;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =====================================================================
-- STORAGE BUCKETS
-- =====================================================================

-- Photos bucket (for Supabase Storage photo uploads)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Frames bucket (for frame template images)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('frames', 'frames', true)
ON CONFLICT (id) DO NOTHING;

-- LUTs bucket (for filter LUT files)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('luts', 'luts', true)
ON CONFLICT (id) DO NOTHING;


-- =====================================================================
-- STORAGE POLICIES — photos bucket
-- =====================================================================

-- Anyone can view photos (gallery is public)
DROP POLICY IF EXISTS "photos_storage_public_read" ON storage.objects;
CREATE POLICY "photos_storage_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'photos');

-- Authenticated users can upload to their tenant folder
DROP POLICY IF EXISTS "photos_storage_auth_upload" ON storage.objects;
CREATE POLICY "photos_storage_auth_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'photos'
    AND auth.role() = 'authenticated'
  );

-- Authenticated users can delete from their tenant folder
DROP POLICY IF EXISTS "photos_storage_auth_delete" ON storage.objects;
CREATE POLICY "photos_storage_auth_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'photos'
    AND auth.role() = 'authenticated'
  );

-- Service role can do anything (for signed upload URLs)
DROP POLICY IF EXISTS "photos_storage_service" ON storage.objects;
CREATE POLICY "photos_storage_service"
  ON storage.objects FOR ALL
  USING (bucket_id = 'photos' AND auth.role() = 'service_role');


-- =====================================================================
-- STORAGE POLICIES — frames bucket
-- =====================================================================

DROP POLICY IF EXISTS "frames_storage_public_read" ON storage.objects;
CREATE POLICY "frames_storage_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'frames');

DROP POLICY IF EXISTS "frames_storage_auth_upload" ON storage.objects;
CREATE POLICY "frames_storage_auth_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'frames'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "frames_storage_auth_update" ON storage.objects;
CREATE POLICY "frames_storage_auth_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'frames'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "frames_storage_auth_delete" ON storage.objects;
CREATE POLICY "frames_storage_auth_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'frames'
    AND auth.role() = 'authenticated'
  );


-- =====================================================================
-- STORAGE POLICIES — luts bucket
-- =====================================================================

DROP POLICY IF EXISTS "luts_storage_public_read" ON storage.objects;
CREATE POLICY "luts_storage_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'luts');

DROP POLICY IF EXISTS "luts_storage_auth_upload" ON storage.objects;
CREATE POLICY "luts_storage_auth_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'luts'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "luts_storage_auth_delete" ON storage.objects;
CREATE POLICY "luts_storage_auth_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'luts'
    AND auth.role() = 'authenticated'
  );


-- =====================================================================
-- HELPER FUNCTIONS
-- =====================================================================

-- Get current user's tenant_id
CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- Check subscription limits
CREATE OR REPLACE FUNCTION check_subscription_limits(p_tenant_id UUID)
RETURNS JSONB AS $$
DECLARE
  sub RECORD;
  device_count INTEGER;
  event_count INTEGER;
  storage_used BIGINT;
BEGIN
  -- Get active subscription
  SELECT * INTO sub
  FROM subscriptions
  WHERE tenant_id = p_tenant_id
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'has_subscription', false,
      'can_add_device', false,
      'can_add_event', false,
      'storage_available', false
    );
  END IF;

  -- Count current usage
  SELECT COUNT(*) INTO device_count
  FROM devices WHERE tenant_id = p_tenant_id;

  SELECT COUNT(*) INTO event_count
  FROM events WHERE tenant_id = p_tenant_id;

  SELECT COALESCE(SUM(file_size), 0) INTO storage_used
  FROM photos WHERE tenant_id = p_tenant_id;

  RETURN jsonb_build_object(
    'has_subscription', true,
    'plan', sub.plan,
    'can_add_device', device_count < sub.device_limit,
    'can_add_event', event_count < sub.event_limit,
    'storage_available', (storage_used / 1048576) < sub.storage_limit,
    'device_usage', jsonb_build_object('current', device_count, 'limit', sub.device_limit),
    'event_usage', jsonb_build_object('current', event_count, 'limit', sub.event_limit),
    'storage_usage', jsonb_build_object('current_mb', storage_used / 1048576, 'limit_mb', sub.storage_limit)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- =====================================================================
-- SUBSCRIPTION PLAN REFERENCE
-- =====================================================================
-- Plan     | Devices | Events | Storage | Price
-- ---------|---------|--------|---------|----------
-- free     | 1       | 5      | 500 MB  | Rp 0
-- basic    | 3       | 50     | 5 GB    | Rp 350.000
-- pro      | 10      | 999 (∞)| 50 GB   | Rp 750.000
-- =====================================================================

-- =====================================================================
-- FINAL SYNC & CACHE RELOAD
-- =====================================================================
-- Ensure API roles can see everything in public
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Force search path again just to be sure
ALTER ROLE authenticator SET search_path TO public, auth, storage;

-- Set default tenant IDs to automatically fill from auth.uid()
ALTER TABLE events ALTER COLUMN tenant_id SET DEFAULT get_my_tenant_id();
ALTER TABLE devices ALTER COLUMN tenant_id SET DEFAULT get_my_tenant_id();
ALTER TABLE frames ALTER COLUMN tenant_id SET DEFAULT get_my_tenant_id();
ALTER TABLE luts ALTER COLUMN tenant_id SET DEFAULT get_my_tenant_id();
ALTER TABLE photos ALTER COLUMN tenant_id SET DEFAULT get_my_tenant_id();
ALTER TABLE tenant_settings ALTER COLUMN tenant_id SET DEFAULT get_my_tenant_id();

-- RELOAD SCHEMA CACHE (Run multiple times to be safe)
NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- END OF SCHEMA
-- =====================================================================
