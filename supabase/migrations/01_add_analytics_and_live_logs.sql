-- Migration: Add analytics_events and live_logs tables
-- Date: 2026-08-12

-- 1. ANALYTICS EVENTS
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read analytics events" ON public.analytics_events;
CREATE POLICY "Public read analytics events"
  ON public.analytics_events FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Public insert analytics events" ON public.analytics_events;
CREATE POLICY "Public insert analytics events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (TRUE);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON public.analytics_events(event_name);

-- 2. LIVE LOGS
CREATE TABLE IF NOT EXISTS public.live_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error'))
);

ALTER TABLE public.live_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read live logs" ON public.live_logs;
CREATE POLICY "Public read live logs"
  ON public.live_logs FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Public insert live logs" ON public.live_logs;
CREATE POLICY "Public insert live logs"
  ON public.live_logs FOR INSERT
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Public delete live logs" ON public.live_logs;
CREATE POLICY "Public delete live logs"
  ON public.live_logs FOR DELETE
  USING (TRUE);

CREATE INDEX IF NOT EXISTS idx_live_logs_timestamp ON public.live_logs(timestamp DESC);
