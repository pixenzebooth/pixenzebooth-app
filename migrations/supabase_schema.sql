-- Create the frames table
CREATE TABLE frames (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  type TEXT DEFAULT 'custom',
  status TEXT DEFAULT 'active', -- 'active', 'coming_soon', 'hidden'
  layout_config JSONB DEFAULT NULL, -- Array of { x, y, width, height, rotation }
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: You also need to create a Storage Bucket named 'frames' and ensure it's public.
-- In Supabase Dashboard -> Storage -> New Bucket -> 'frames' (Public: Yes)

-- RLS Policies (Row Level Security)
ALTER TABLE frames ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone
CREATE POLICY "Public frames are viewable by everyone" 
ON frames FOR SELECT USING (true);

-- Allow insert/update/delete mainly for authenticated users (or specific admin email)
-- For this MVP, we will allow any authenticated user to manage frames (assuming only admin logs in)
-- Ideally, checking user email would be better: auth.jwt() ->> 'email' = 'your-email@gmail.com'
CREATE POLICY "Authenticated users can manage frames" 
ON frames FOR ALL USING (auth.role() = 'authenticated');
