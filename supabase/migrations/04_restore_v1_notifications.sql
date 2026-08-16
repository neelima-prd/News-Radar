-- ====================================================================
-- NEWS RADAR V1: RESTORE NOTIFICATION SUBSCRIPTIONS & PREFERENCE
-- Migration: 04_restore_v1_notifications.sql
-- ====================================================================

-- 1. Restore notifications_enabled column on user_preferences
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT FALSE NOT NULL;

-- 2. Restore notification_subscriptions table for Web Push
CREATE TABLE IF NOT EXISTS public.notification_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_user_endpoint UNIQUE (user_id, endpoint)
);

-- Ensure index on endpoint
CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_subs_endpoint_unique 
ON public.notification_subscriptions (endpoint);

-- Relax strict foreign key constraint if it exists to allow decoupled user UUIDs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'notification_subscriptions_user_id_fkey' 
    AND table_name = 'notification_subscriptions'
  ) THEN
    ALTER TABLE public.notification_subscriptions DROP CONSTRAINT notification_subscriptions_user_id_fkey;
  END IF;
END $$;

-- 3. Create high-performance indexes
CREATE INDEX IF NOT EXISTS idx_notif_subs_user_active 
ON public.notification_subscriptions (user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_notif_subs_endpoint 
ON public.notification_subscriptions (endpoint);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.notification_subscriptions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "Users can view their own push subscriptions" ON public.notification_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own push subscriptions" ON public.notification_subscriptions;
DROP POLICY IF EXISTS "Users can update their own push subscriptions" ON public.notification_subscriptions;
DROP POLICY IF EXISTS "Users can delete their own push subscriptions" ON public.notification_subscriptions;
DROP POLICY IF EXISTS "Allow read push subscriptions" ON public.notification_subscriptions;
DROP POLICY IF EXISTS "Allow insert push subscriptions" ON public.notification_subscriptions;
DROP POLICY IF EXISTS "Allow update push subscriptions" ON public.notification_subscriptions;
DROP POLICY IF EXISTS "Allow delete push subscriptions" ON public.notification_subscriptions;

CREATE POLICY "Allow read push subscriptions"
ON public.notification_subscriptions
FOR SELECT
USING (TRUE);

CREATE POLICY "Allow insert push subscriptions"
ON public.notification_subscriptions
FOR INSERT
WITH CHECK (TRUE);

CREATE POLICY "Allow update push subscriptions"
ON public.notification_subscriptions
FOR UPDATE
USING (TRUE)
WITH CHECK (TRUE);

CREATE POLICY "Allow delete push subscriptions"
ON public.notification_subscriptions
FOR DELETE
USING (TRUE);

