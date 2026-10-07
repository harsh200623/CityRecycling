-- ====================================================================
-- ADD PHONE TO PROFILES (Run this in Supabase SQL Editor!)
-- ====================================================================

-- 1. ADD PHONE COLUMN
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
