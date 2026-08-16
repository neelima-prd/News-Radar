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
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_user_endpoint UNIQUE (user_id, endpoint)
);

-- 3. Create high-performance indexes
CREATE INDEX IF NOT EXISTS idx_notif_subs_user_active 
ON public.notification_subscriptions (user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_notif_subs_endpoint 
ON public.notification_subscriptions (endpoint);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.notification_subscriptions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies (Users can only manage their own subscriptions)
CREATE POLICY "Users can view their own push subscriptions"
ON public.notification_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push subscriptions"
ON public.notification_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push subscriptions"
ON public.notification_subscriptions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions"
ON public.notification_subscriptions
FOR DELETE
USING (auth.uid() = user_id);
