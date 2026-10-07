-- ====================================================================
-- SOCIAL FEATURES UPDATE (Run this in Supabase SQL Editor!)
-- ====================================================================

-- 1. ADD RESOLUTION IMAGE TO COMPLAINTS
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS resolution_image_url TEXT;

-- 2. CREATE COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    complaint_id UUID REFERENCES public.complaints(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. CREATE UPVOTES TABLE
CREATE TABLE IF NOT EXISTS public.complaint_upvotes (
    complaint_id UUID REFERENCES public.complaints(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (complaint_id, user_id)
);

-- 4. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_upvotes ENABLE ROW LEVEL SECURITY;

-- 5. COMMENTS POLICIES
CREATE POLICY "Comments are viewable by everyone" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. UPVOTES POLICIES
CREATE POLICY "Upvotes are viewable by everyone" ON public.complaint_upvotes FOR SELECT USING (true);
CREATE POLICY "Users can insert their own upvotes" ON public.complaint_upvotes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own upvotes" ON public.complaint_upvotes FOR DELETE USING (auth.uid() = user_id);
