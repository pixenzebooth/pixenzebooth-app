-- ============================================
-- Gaskenn Photobooth — Desktop Database Schema
-- Run this in your NEW Supabase SQL Editor
-- ============================================

-- 1. Licenses table for subscription management
CREATE TABLE IF NOT EXISTS licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key TEXT UNIQUE NOT NULL,
  owner_name TEXT,
  owner_email TEXT,
  plan TEXT CHECK (plan IN ('monthly', 'yearly')) DEFAULT 'monthly',
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  hardware_id TEXT,
  max_activations INTEGER DEFAULT 1,
  activation_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on licenses
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;

-- Public read policy (anon key can validate licenses)
CREATE POLICY "Allow public license validation" ON licenses
  FOR SELECT
  USING (true);

-- 2. Global settings table with custom logo support
CREATE TABLE IF NOT EXISTS global_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  active_theme TEXT DEFAULT 'default',
  audio_url TEXT DEFAULT '',
  primary_color TEXT DEFAULT '#ba1c16',
  secondary_color TEXT DEFAULT '#face10',
  bg_image_url TEXT DEFAULT '',
  custom_logo_url TEXT DEFAULT '',
  app_name TEXT DEFAULT 'Gaskenn Photobooth',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;

-- Public read policy
CREATE POLICY "Allow public read global_settings" ON global_settings
  FOR SELECT
  USING (true);

-- Insert default row
INSERT INTO global_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 3. Frames table (same structure as original photobooth)
CREATE TABLE IF NOT EXISTS frames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  is_premium BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  theme TEXT DEFAULT 'default',
  audio_url TEXT,
  transition_video_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE frames ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read frames" ON frames
  FOR SELECT
  USING (is_active = true);

-- 4. Photo history table
CREATE TABLE IF NOT EXISTS photo_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES licenses(id),
  frame_id UUID REFERENCES frames(id),
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE photo_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert photo_history" ON photo_history
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow read own photo_history" ON photo_history
  FOR SELECT
  USING (true);

-- 5. Enable realtime for global_settings
ALTER PUBLICATION supabase_realtime ADD TABLE global_settings;

-- ============================================
-- Sample license key for testing
-- ============================================
INSERT INTO licenses (license_key, owner_name, owner_email, plan, expires_at, is_active)
VALUES (
  'GASKENN-DEMO-2024-XXXX',
  'Demo User',
  'demo@gaskenn.com',
  'yearly',
  NOW() + INTERVAL '1 year',
  true
);
