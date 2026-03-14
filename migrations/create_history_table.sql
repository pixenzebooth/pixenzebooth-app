-- Drop table first if exists to reset constraints
DROP TABLE IF EXISTS public.history;

-- Create the history table WITHOUT Foreign Key constraint for easier migration
-- This allows old user_ids to exist even if those users aren't in the new Auth system yet
CREATE TABLE public.history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID, -- Removed "REFERENCES auth.users(id)" to avoid import errors
    url TEXT,
    email TEXT,
    gdrive_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to insert their history
CREATE POLICY "Users can insert their own history" 
ON public.history FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL); 

-- Create policy to allow users to read their own history
CREATE POLICY "Users can view their own history" 
ON public.history FOR SELECT 
USING (auth.uid() = user_id);
