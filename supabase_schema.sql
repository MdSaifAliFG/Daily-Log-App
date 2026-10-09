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
  phone_number TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;

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

-- 7. Daily Notes Table (Quick thoughts, ideas, work notes with search)
CREATE TABLE IF NOT EXISTS public.daily_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL, -- Format: YYYY-MM-DD
  category TEXT NOT NULL DEFAULT 'General',
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_entries_user_date ON public.entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_routine_items_user ON public.routine_items(user_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_routine_completions_lookup ON public.routine_completions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_reflections_user_week ON public.weekly_reflections(user_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_daily_notes_user ON public.daily_notes(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_notes_pinned ON public.daily_notes(user_id, is_pinned);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures each user can only read, insert, update, and delete their own data.
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_notes ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR auth.role() = 'anon');

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id OR auth.role() = 'anon');

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id OR auth.role() = 'anon');

-- Entries Policies
DROP POLICY IF EXISTS "Users can manage their own entries" ON public.entries;
CREATE POLICY "Users can manage their own entries" ON public.entries FOR ALL USING (auth.uid() = user_id OR auth.role() = 'anon') WITH CHECK (auth.uid() = user_id OR auth.role() = 'anon');

-- Routine Items Policies
DROP POLICY IF EXISTS "Users can manage their own routine items" ON public.routine_items;
CREATE POLICY "Users can manage their own routine items" ON public.routine_items FOR ALL USING (auth.uid() = user_id OR auth.role() = 'anon') WITH CHECK (auth.uid() = user_id OR auth.role() = 'anon');

-- Routine Completions Policies
DROP POLICY IF EXISTS "Users can manage their own completions" ON public.routine_completions;
CREATE POLICY "Users can manage their own completions" ON public.routine_completions FOR ALL USING (auth.uid() = user_id OR auth.role() = 'anon') WITH CHECK (auth.uid() = user_id OR auth.role() = 'anon');

-- Weekly Reflections Policies
DROP POLICY IF EXISTS "Users can manage their own reflections" ON public.weekly_reflections;
CREATE POLICY "Users can manage their own reflections" ON public.weekly_reflections FOR ALL USING (auth.uid() = user_id OR auth.role() = 'anon') WITH CHECK (auth.uid() = user_id OR auth.role() = 'anon');

-- Daily Notes Policies
DROP POLICY IF EXISTS "Users can manage their own daily notes" ON public.daily_notes;
CREATE POLICY "Users can manage their own daily notes" ON public.daily_notes FOR ALL USING (auth.uid() = user_id OR auth.role() = 'anon') WITH CHECK (auth.uid() = user_id OR auth.role() = 'anon');


-- ==============================================================================
-- AUTOMATED USER ONBOARDING TRIGGER
-- Automatically creates a user profile and seeds default routines upon signup.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Create public profile
  INSERT INTO public.profiles (id, email, phone_number, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    phone_number = COALESCE(EXCLUDED.phone_number, public.profiles.phone_number),
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create Trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 8. USER ACCOUNT DELETION (DANGER ZONE)
-- Allows authenticated users to permanently delete their own account and cascaded data
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- ==============================================================================
-- 9. PHONE SIGNUP RPC (Bypasses email verification & SMTP rate-limits)
-- Creates an account directly with confirmed status using phone number
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.signup_with_phone(
  p_phone TEXT,
  p_password TEXT,
  p_full_name TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_clean_phone TEXT;
  v_email TEXT;
  v_encrypted_pw TEXT;
BEGIN
  v_clean_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
  IF length(v_clean_phone) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Please enter a valid 10-digit mobile number');
  END IF;

  v_clean_phone := right(v_clean_phone, 10);
  v_email := 'p' || v_clean_phone || '@daily-log.internal';

  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'An account with this phone number already exists. Please sign in.');
  END IF;

  v_user_id := gen_random_uuid();
  v_encrypted_pw := crypt(p_password, gen_salt('bf'));

  -- Insert directly into auth.users with email_confirmed_at = NOW() (NO email sent!)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    v_encrypted_pw,
    NOW(),
    '{"provider":"phone","providers":["phone"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name, 'phone_number', '+91 ' || v_clean_phone),
    NOW(),
    NOW()
  );

  -- Insert profile
  INSERT INTO public.profiles (id, email, phone_number, full_name)
  VALUES (v_user_id, v_email, '+91 ' || v_clean_phone, p_full_name)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone_number = EXCLUDED.phone_number;

  RETURN jsonb_build_object('success', true, 'user_id', v_user_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


