-- ====================================================================
-- MIGRATION 03: FINALIZE NEWS RADAR V1 (11-TABLE ARCHITECTURE)
-- Date: 2026-08-13
-- Target: Deployed Supabase PostgreSQL Instance
--
-- IMPORTANT SAFETY NOTE:
-- This script brings the production database into alignment with the final 11-table
-- V1 architecture by dropping deferred future-scope tables and unused columns.
--
-- DO NOT EXECUTE AUTOMATICALLY. Review the script and execute manually in the
-- Supabase SQL Editor after checking row counts if needed.
-- ====================================================================

-- 1. Remove legacy columns from V1 tables
ALTER TABLE public.user_preferences DROP COLUMN IF EXISTS notifications_enabled;

-- 2. Drop triggers and policies on deferred tables before dropping tables
DROP TRIGGER IF EXISTS tr_notification_subscriptions_updated_at ON public.notification_subscriptions;

DROP POLICY IF EXISTS "Users can view their feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can insert their feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can update their feedback" ON public.feedback;

DROP POLICY IF EXISTS "Users can view notification subscriptions" ON public.notification_subscriptions;
DROP POLICY IF EXISTS "Users can insert notification subscriptions" ON public.notification_subscriptions;
DROP POLICY IF EXISTS "Users can update notification subscriptions" ON public.notification_subscriptions;
DROP POLICY IF EXISTS "Users can delete notification subscriptions" ON public.notification_subscriptions;

DROP POLICY IF EXISTS "Public read analytics events" ON public.analytics_events;
DROP POLICY IF EXISTS "Public insert analytics events" ON public.analytics_events;

DROP POLICY IF EXISTS "Public read live logs" ON public.live_logs;
DROP POLICY IF EXISTS "Public insert live logs" ON public.live_logs;
DROP POLICY IF EXISTS "Public delete live logs" ON public.live_logs;

-- 3. Safely drop deferred out-of-scope tables if present
-- (feedback -> V1.1, notification_subscriptions -> V1.1, ingestion_runs -> V2, ai_processing_runs -> V2)
DROP TABLE IF EXISTS public.feedback CASCADE;
DROP TABLE IF EXISTS public.notification_subscriptions CASCADE;
DROP TABLE IF EXISTS public.ingestion_runs CASCADE;
DROP TABLE IF EXISTS public.ai_processing_runs CASCADE;
DROP TABLE IF EXISTS public.analytics_events CASCADE;
DROP TABLE IF EXISTS public.live_logs CASCADE;

-- 4. Re-confirm search path and permissions on remaining 11 tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, anon;
