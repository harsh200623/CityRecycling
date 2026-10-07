-- CivicSense: Urban Refuse Tracking and Management System Schema (Milestone 2)

-- Drop old tables if they exist to start fresh
DROP TABLE IF EXISTS public.pickups CASCADE;
DROP TABLE IF EXISTS public.collection_routes CASCADE;
DROP TABLE IF EXISTS public.refuse_bins CASCADE;
DROP TABLE IF EXISTS public.complaints CASCADE;
DROP TABLE IF EXISTS public.dustbins CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. PROFILES TABLE
-- ==========================================
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('admin', 'collector', 'citizen')) DEFAULT 'citizen',
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 2. DUSTBINS TABLE
-- ==========================================
CREATE TABLE public.dustbins (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    location_lat DECIMAL(10, 8) NOT NULL,
    location_lng DECIMAL(11, 8) NOT NULL,
    address TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 3. COMPLAINTS TABLE
-- ==========================================
CREATE TABLE public.complaints (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Litter', 'Overflowing Bin', 'Hazardous', 'Other')),
    description TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Pending', 'In Progress', 'Resolved')) DEFAULT 'Pending',
    location_lat DECIMAL(10, 8) NOT NULL,
    location_lng DECIMAL(11, 8) NOT NULL,
    assigned_collector_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dustbins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- --- Profiles Policies ---
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- --- Dustbins Policies ---
-- Everyone can view dustbins
CREATE POLICY "Dustbins are viewable by everyone" ON public.dustbins FOR SELECT USING (true);
-- Only admins can add or delete dustbins
CREATE POLICY "Admins can manage dustbins" ON public.dustbins FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- --- Complaints Policies ---
-- Everyone can view all complaints (needed for the Civic Feed)
CREATE POLICY "Complaints are viewable by everyone" ON public.complaints FOR SELECT USING (true);

-- Citizens can insert complaints (and they must be the creator)
CREATE POLICY "Citizens can insert complaints" ON public.complaints FOR INSERT WITH CHECK (
  auth.uid() = creator_id
);

-- Admins have full access to complaints (to reassign collectors, etc)
CREATE POLICY "Admins can manage complaints" ON public.complaints FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Collectors can update complaints assigned to them (to change status or add resolution notes)
CREATE POLICY "Collectors can update assigned complaints" ON public.complaints FOR UPDATE USING (
  assigned_collector_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
