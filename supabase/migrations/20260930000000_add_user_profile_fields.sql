-- ==============================================================================
-- APEXSMC DATABASE MIGRATION: Phase 5 User Profile Fields
-- Adds first_name, last_name, location to public.profiles and updates trigger
-- ==============================================================================

-- 1. Add new columns to public.profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS location TEXT;

-- 2. Update handle_new_user() trigger function to extract metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_first_name TEXT;
    v_last_name TEXT;
    v_display_name TEXT;
    v_location TEXT;
    v_avatar_url TEXT;
BEGIN
    v_first_name := new.raw_user_meta_data->>'first_name';
    v_last_name := new.raw_user_meta_data->>'last_name';
    v_location := new.raw_user_meta_data->>'location';
    v_avatar_url := new.raw_user_meta_data->>'avatar_url';

    -- Compute display name fallback
    IF v_first_name IS NOT NULL AND v_last_name IS NOT NULL THEN
        v_display_name := trim(v_first_name || ' ' || v_last_name);
    ELSIF new.raw_user_meta_data->>'display_name' IS NOT NULL THEN
        v_display_name := new.raw_user_meta_data->>'display_name';
    ELSIF new.raw_user_meta_data->>'full_name' IS NOT NULL THEN
        v_display_name := new.raw_user_meta_data->>'full_name';
    ELSE
        v_display_name := split_part(new.email, '@', 1);
    END IF;

    INSERT INTO public.profiles (
        id,
        display_name,
        first_name,
        last_name,
        location,
        avatar_url,
        default_strategy,
        default_symbol,
        default_timeframe,
        created_at,
        updated_at
    )
    VALUES (
        new.id,
        v_display_name,
        v_first_name,
        v_last_name,
        v_location,
        v_avatar_url,
        COALESCE(new.raw_user_meta_data->>'default_strategy', 'SMC'),
        COALESCE(new.raw_user_meta_data->>'default_symbol', 'V75'),
        COALESCE(new.raw_user_meta_data->>'default_timeframe', 'H1'),
        timezone('utc', now()),
        timezone('utc', now())
    )
    ON CONFLICT (id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        location = EXCLUDED.location,
        display_name = EXCLUDED.display_name,
        updated_at = timezone('utc', now());

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
