-- ==============================================================================
-- APEXSMC INITIAL DATABASE SCHEMA & ROW LEVEL SECURITY (RLS)
-- Phase 1: Authentication, Profiles, Snapshots, Analyses, and Usage Events
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. TABLE: public.profiles
-- User identity, workspace settings, and trading terminal defaults
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL DEFAULT 'Apex Trader',
    avatar_url TEXT,
    default_strategy TEXT NOT NULL DEFAULT 'SMC',
    default_symbol TEXT NOT NULL DEFAULT 'EURUSD',
    default_timeframe TEXT NOT NULL DEFAULT 'H1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Index for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);

-- ==============================================================================
-- 3. TABLE: public.snapshots
-- Uploaded / captured chart snapshot images and visible context
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    symbol TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    chart_timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    visible_range JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Indexes for snapshots
CREATE INDEX IF NOT EXISTS idx_snapshots_user_created ON public.snapshots(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_symbol ON public.snapshots(symbol);

-- ==============================================================================
-- 4. TABLE: public.analyses
-- Gemini-powered technical analysis reports, key levels, evidence, and scores
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    snapshot_id UUID REFERENCES public.snapshots(id) ON DELETE SET NULL,
    symbol TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    strategy TEXT NOT NULL, -- 'SMC', 'CHART_PATTERNS', 'CANDLESTICK', 'CONFLUENCE'
    custom_question TEXT,
    status TEXT NOT NULL DEFAULT 'completed', -- 'pending', 'completed', 'failed'
    bias TEXT NOT NULL, -- 'BULLISH', 'BEARISH', 'NEUTRAL'
    confluence_score NUMERIC CHECK (confluence_score >= 0 AND confluence_score <= 100),
    result JSONB NOT NULL,
    model_name TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    processing_duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Indexes for analyses
CREATE INDEX IF NOT EXISTS idx_analyses_user_created ON public.analyses(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_symbol ON public.analyses(symbol);
CREATE INDEX IF NOT EXISTS idx_analyses_strategy ON public.analyses(strategy);
CREATE INDEX IF NOT EXISTS idx_analyses_bias ON public.analyses(bias);

-- ==============================================================================
-- 5. TABLE: public.usage_events
-- Operational telemetry, token counts, cost tracking, and rate limiting audit
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    analysis_id UUID REFERENCES public.analyses(id) ON DELETE SET NULL,
    provider TEXT NOT NULL DEFAULT 'google_genai',
    model_id TEXT NOT NULL,
    input_tokens INTEGER,
    output_tokens INTEGER,
    cost_estimate_usd NUMERIC(10, 6) DEFAULT 0,
    status TEXT NOT NULL, -- 'success', 'rate_limited', 'error'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Index for usage_events
CREATE INDEX IF NOT EXISTS idx_usage_events_user_created ON public.usage_events(user_id, created_at DESC);

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict user-ownership isolation across all private workspace tables
-- ==============================================================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

-- 6.1 Profiles Policies
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 6.2 Snapshots Policies
CREATE POLICY "Users can view their own snapshots"
    ON public.snapshots FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own snapshots"
    ON public.snapshots FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own snapshots"
    ON public.snapshots FOR DELETE
    USING (auth.uid() = user_id);

-- 6.3 Analyses Policies
CREATE POLICY "Users can view their own analyses"
    ON public.analyses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analyses"
    ON public.analyses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analyses"
    ON public.analyses FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analyses"
    ON public.analyses FOR DELETE
    USING (auth.uid() = user_id);

-- 6.4 Usage Events Policies
CREATE POLICY "Users can view their own usage events"
    ON public.usage_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage events"
    ON public.usage_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 7. AUTOMATIC PROFILE CREATION TRIGGER
-- Auto-populates public.profiles when a new user signs up in auth.users
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, avatar_url)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'avatar_url'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 8. STORAGE BUCKET CONFIGURATION (for Supabase Storage)
-- ==============================================================================
-- Note: Insert chart-snapshots bucket into storage.buckets if available
INSERT INTO storage.buckets (id, name, public)
VALUES ('chart-snapshots', 'chart-snapshots', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Users can only upload and read files in their own folder (user_id/...)
CREATE POLICY "Users can upload snapshots to own folder"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'chart-snapshots' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can view snapshots in own folder"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'chart-snapshots' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete snapshots in own folder"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'chart-snapshots' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );
