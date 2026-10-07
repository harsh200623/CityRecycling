-- ====================================================================
-- ADD EMAIL TO PROFILES & SYNC (Run this in Supabase SQL Editor!)
-- ====================================================================

-- 1. ADD EMAIL COLUMN
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. SYNC EXISTING EMAILS
-- This copies the email from the secure auth.users table over to public.profiles
UPDATE public.profiles
SET email = auth.users.email
FROM auth.users
WHERE public.profiles.id = auth.users.id;

-- 3. UPDATE THE TRIGGER
-- This ensures that any NEW users who sign up automatically get their email copied over too
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Citizen'), 
    NEW.email,
    'citizen'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
