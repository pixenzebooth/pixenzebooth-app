-- CAMPAIGN SYSTEM TABLES

-- 1. Create a table to store global campaign settings
CREATE TABLE IF NOT EXISTS campaign_settings (
    id INT PRIMARY KEY DEFAULT 1, -- Only 1 row usually
    is_active BOOLEAN DEFAULT FALSE,
    campaign_name TEXT DEFAULT 'Lucky 10 Giveaway',
    max_winners INT DEFAULT 10,
    current_winners INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Insert default row if not exists
INSERT INTO campaign_settings (id, is_active, max_winners)
VALUES (1, false, 10)
ON CONFLICT (id) DO NOTHING;

-- 2. Create a table to store the winners
CREATE TABLE IF NOT EXISTS campaign_winners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID, -- Optional linkage to auth.users
    name TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    address TEXT NOT NULL,
    photo_url TEXT, -- The winning photo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Security (RLS)
ALTER TABLE campaign_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_winners ENABLE ROW LEVEL SECURITY;

-- 3a. Everyone can READ/VIEW campaign settings (to check if active)
CREATE POLICY "Public can view campaign settings" 
ON campaign_settings FOR SELECT USING (true);

-- 3b. Only Admin can UPDATE settings (Turn ON/OFF)
-- Replace email with your admin emails
CREATE POLICY "Admins can update campaign settings" 
ON campaign_settings FOR UPDATE 
USING (auth.jwt() ->> 'email' IN ('nnvnxx.10@gmail.com', 'admin@sparklebooth.com'));

-- 3c. Public (Winners) can INSERT data into winners table
CREATE POLICY "Public can insert winner data" 
ON campaign_winners FOR INSERT 
WITH CHECK (true);

-- 3d. Only Admins can VIEW winner data (Sensitive info: Address/WA)
CREATE POLICY "Admins can view winners" 
ON campaign_winners FOR SELECT 
USING (auth.jwt() ->> 'email' IN ('nnvnxx.10@gmail.com', 'admin@sparklebooth.com'));
