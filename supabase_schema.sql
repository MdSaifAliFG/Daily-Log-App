-- ==============================================================================
-- DAILY LOG APP - SUPABASE COMPLETE DATABASE SETUP SCRIPT
-- ==============================================================================
-- Copy and paste this entire script into your Supabase SQL Editor and click "RUN".
-- It creates all required tables, Row Level Security (RLS) policies, indexes,
-- and an automated trigger that sets up user profiles and starter routines upon signup.
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. User Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Daily Journal Entries Table
CREATE TABLE IF NOT EXISTS public.entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date TEXT NOT NULL, -- Format: YYYY-MM-DD
  journal_text TEXT NOT NULL DEFAULT '',
  mood_rating INTEGER CHECK (mood_rating >= 1 AND mood_rating <= 5),
  top_priorities JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

-- 4. Routine Items Table (Habits & Rituals)
CREATE TABLE IF NOT EXISTS public.routine_items (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Daily Routine Completions Table
CREATE TABLE IF NOT EXISTS public.routine_completions (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date TEXT NOT NULL, -- Format: YYYY-MM-DD
  routine_item_id BIGINT REFERENCES public.routine_items(id) ON DELETE CASCADE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (user_id, date, routine_item_id)
);

-- 6. Weekly Reflections Table
CREATE TABLE IF NOT EXISTS public.weekly_reflections (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start_date TEXT NOT NULL, -- Format: YYYY-MM-DD (Monday)
  went_well TEXT NOT NULL DEFAULT '',
  improve TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, week_start_date)
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_entries_user_date ON public.entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_routine_items_user ON public.routine_items(user_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_routine_completions_lookup ON public.routine_completions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_reflections_user_week ON public.weekly_reflections(user_id, week_start_date);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures each user can only read, insert, update, and delete their own data.
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reflections ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Entries Policies
DROP POLICY IF EXISTS "Users can manage their own entries" ON public.entries;
CREATE POLICY "Users can manage their own entries" ON public.entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Routine Items Policies
DROP POLICY IF EXISTS "Users can manage their own routine items" ON public.routine_items;
CREATE POLICY "Users can manage their own routine items" ON public.routine_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Routine Completions Policies
DROP POLICY IF EXISTS "Users can manage their own completions" ON public.routine_completions;
CREATE POLICY "Users can manage their own completions" ON public.routine_completions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Weekly Reflections Policies
DROP POLICY IF EXISTS "Users can manage their own reflections" ON public.weekly_reflections;
CREATE POLICY "Users can manage their own reflections" ON public.weekly_reflections FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- AUTOMATED USER ONBOARDING TRIGGER
-- Automatically creates a user profile and seeds default routines upon signup.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Create public profile
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Seed starter routine items for the new user
  INSERT INTO public.routine_items (user_id, name, sort_order)
  VALUES
    (NEW.id, 'Exercise & stretch', 0),
    (NEW.id, '8 hours restful sleep', 1),
    (NEW.id, 'Deep work block', 2),
    (NEW.id, 'No phone before bed', 3),
    (NEW.id, 'Read 20 minutes', 4)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create Trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
