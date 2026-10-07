-- ====================================================================
-- FINAL SCHEMA UPDATE (Run this in Supabase SQL Editor!)
-- ====================================================================

-- 1. ADD IMAGE SUPPORT TO COMPLAINTS
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. CREATE STORAGE BUCKET FOR IMAGES
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'complaint_images',
  'complaint_images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- 3. STORAGE SECURITY POLICIES
-- Allow anyone to view images
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'complaint_images' );

-- Allow logged in users to upload images
CREATE POLICY "Authenticated users can upload" 
ON storage.objects FOR INSERT 
WITH CHECK ( 
  bucket_id = 'complaint_images' 
  AND auth.role() = 'authenticated' 
);

-- 4. UPDATE COMPLAINTS RLS FOR COLLECTOR CLAIMING
DROP POLICY IF EXISTS "Collectors can update assigned complaints" ON public.complaints;
CREATE POLICY "Collectors can claim and update complaints" ON public.complaints FOR UPDATE USING (
  -- A collector can claim an unassigned complaint
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'collector') AND assigned_collector_id IS NULL)
  OR
  -- Or update it if it's already theirs
  assigned_collector_id = auth.uid()
  OR 
  -- Admins can do anything
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 5. UPDATE PROFILES RLS FOR ADMIN USER MANAGEMENT
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile or Admins can update any profile" ON public.profiles FOR UPDATE USING (
  auth.uid() = id 
  OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
