-- ====================================================================
-- NEWS RADAR V1 - PRODUCTION DATABASE SCHEMA
-- Target Environment: Supabase PostgreSQL with Supabase Auth
-- ====================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- 1. PROFILES
-- Associated with auth.users (including anonymous users)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NULL,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ====================================================================
-- 2. TOPICS
-- Master list of topics (Public read access)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_available BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access to active topics" ON public.topics;
CREATE POLICY "Public read access to active topics"
  ON public.topics FOR SELECT
  USING (TRUE);

-- Seed V1 Topics
INSERT INTO public.topics (slug, name, description, is_active, is_available, sort_order)
VALUES 
  ('technology', 'Technology', 'Breakthroughs in computing, systems, engineering, and digital infrastructure.', TRUE, TRUE, 1),
  ('startups', 'Startups', 'Venture capital, early-stage company launches, product launches, and founder shifts.', TRUE, TRUE, 2),
  ('ai', 'AI & Machine Learning', 'Frontier models, agent frameworks, research papers, and compute trends.', TRUE, FALSE, 3),
  ('india-business-technology', 'India Business & Technology', 'Startups, policy, venture investments, and tech growth in India.', TRUE, FALSE, 4),
  ('business', 'Business', 'Corporate strategy, market expansions, macroeconomics, and leadership.', TRUE, FALSE, 5),
  ('markets', 'Markets', 'Public equities, venture valuations, interest rates, and liquidity trends.', TRUE, FALSE, 6)
ON CONFLICT (slug) DO UPDATE 
SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_available = EXCLUDED.is_available,
  sort_order = EXCLUDED.sort_order;

-- ====================================================================
-- 3. USER TOPICS
-- Topics followed by each user
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.user_topics (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, topic_id)
);

ALTER TABLE public.user_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their topic subscriptions" ON public.user_topics;
CREATE POLICY "Users can view their topic subscriptions"
  ON public.user_topics FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their topic subscriptions" ON public.user_topics;
CREATE POLICY "Users can insert their topic subscriptions"
  ON public.user_topics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their topic subscriptions" ON public.user_topics;
CREATE POLICY "Users can update their topic subscriptions"
  ON public.user_topics FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their topic subscriptions" ON public.user_topics;
CREATE POLICY "Users can delete their topic subscriptions"
  ON public.user_topics FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_topics_user_id ON public.user_topics(user_id);

-- ====================================================================
-- 4. USER PREFERENCES
-- User briefing settings
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  briefing_frequency_hours INTEGER DEFAULT 6 CHECK (briefing_frequency_hours IN (3, 6, 12, 24)),
  notifications_enabled BOOLEAN DEFAULT FALSE,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their preferences" ON public.user_preferences;
CREATE POLICY "Users can view their preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their preferences" ON public.user_preferences;
CREATE POLICY "Users can insert their preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their preferences" ON public.user_preferences;
CREATE POLICY "Users can update their preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);

-- ====================================================================
-- 5. SOURCES
-- Internal backend source registry
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  base_url TEXT,
  feed_url TEXT,
  source_type TEXT DEFAULT 'rss',
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  trust_score NUMERIC(3,2) DEFAULT 1.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS enabled; no public policies added (internal backend table accessible via service_role)
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 6. ARTICLES
-- Raw normalized news articles
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL,
  external_id TEXT,
  title TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  author TEXT,
  description TEXT,
  content TEXT,
  published_at TIMESTAMPTZ, -- Nullable, no DEFAULT NOW()
  ingested_at TIMESTAMPTZ DEFAULT NOW(),
  image_url TEXT,
  content_hash TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_source_external_id UNIQUE (source_id, external_id)
);

-- RLS enabled; no public policies added (internal backend table accessible via service_role)
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_articles_published_at ON public.articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_source_id ON public.articles(source_id);
CREATE INDEX IF NOT EXISTS idx_articles_content_hash ON public.articles(content_hash);

-- ====================================================================
-- 7. ARTICLE CLUSTERS
-- Story clusters grouped from raw articles
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.article_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_title TEXT NOT NULL,
  summary TEXT,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  article_count INTEGER DEFAULT 0,
  deduplication_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS enabled; no public policies added (internal backend table accessible via service_role)
ALTER TABLE public.article_clusters ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_article_clusters_topic_id ON public.article_clusters(topic_id);
CREATE INDEX IF NOT EXISTS idx_article_clusters_last_updated_at ON public.article_clusters(last_updated_at DESC);

-- ====================================================================
-- 8. CLUSTER ARTICLES
-- Link table between clusters and articles
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.cluster_articles (
  cluster_id UUID REFERENCES public.article_clusters(id) ON DELETE CASCADE,
  article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (cluster_id, article_id)
);

-- RLS enabled; no public policies added (internal backend table accessible via service_role)
ALTER TABLE public.cluster_articles ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 9. BRIEFINGS
-- Generated briefings per user
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  status TEXT DEFAULT 'ready' CHECK (status IN ('generating', 'ready', 'failed')),
  article_count_analyzed INTEGER,
  cluster_count INTEGER,
  selected_story_count INTEGER,
  estimated_read_seconds INTEGER,
  generation_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own briefings" ON public.briefings;
CREATE POLICY "Users can view their own briefings"
  ON public.briefings FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_briefings_user_generated ON public.briefings(user_id, generated_at DESC);

-- ====================================================================
-- 10. BRIEFING ITEMS
-- Items included in a user briefing
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.briefing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  briefing_id UUID REFERENCES public.briefings(id) ON DELETE CASCADE,
  cluster_id UUID REFERENCES public.article_clusters(id) ON DELETE SET NULL,
  rank INTEGER NOT NULL,
  priority TEXT DEFAULT 'IMPORTANT' CHECK (priority IN ('TOP STORY', 'IMPORTANT', 'OTHER')),
  category TEXT NOT NULL,
  headline TEXT NOT NULL,
  summary TEXT NOT NULL,
  why_it_matters TEXT NOT NULL,
  why_selected JSONB DEFAULT '[]'::jsonb,
  source_article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_briefing_rank UNIQUE (briefing_id, rank)
);

ALTER TABLE public.briefing_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view briefing items for their briefings" ON public.briefing_items;
CREATE POLICY "Users can view briefing items for their briefings"
  ON public.briefing_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.briefings b
      WHERE b.id = briefing_items.briefing_id AND b.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_briefing_items_briefing_rank ON public.briefing_items(briefing_id, rank);

-- ====================================================================
-- 11. USER STORY STATE
-- Read/unread state per briefing item
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.user_story_state (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  briefing_item_id UUID REFERENCES public.briefing_items(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read')),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, briefing_item_id)
);

ALTER TABLE public.user_story_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their story read state" ON public.user_story_state;
CREATE POLICY "Users can view their story read state"
  ON public.user_story_state FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their story read state" ON public.user_story_state;
CREATE POLICY "Users can insert their story read state"
  ON public.user_story_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their story read state" ON public.user_story_state;
CREATE POLICY "Users can update their story read state"
  ON public.user_story_state FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_story_state_user ON public.user_story_state(user_id);
CREATE INDEX IF NOT EXISTS idx_user_story_state_status ON public.user_story_state(user_id, status);

-- ====================================================================
-- 12. FEEDBACK
-- User feedback on briefing items
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  briefing_item_id UUID REFERENCES public.briefing_items(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('useful', 'not_relevant')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_user_briefing_feedback UNIQUE (user_id, briefing_item_id)
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their feedback" ON public.feedback;
CREATE POLICY "Users can view their feedback"
  ON public.feedback FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their feedback" ON public.feedback;
CREATE POLICY "Users can insert their feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their feedback" ON public.feedback;
CREATE POLICY "Users can update their feedback"
  ON public.feedback FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_feedback_user ON public.feedback(user_id);

-- ====================================================================
-- 13. NOTIFICATION SUBSCRIPTIONS
-- Browser push notification subscriptions
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.notification_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT,
  auth_key TEXT,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notification_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view notification subscriptions" ON public.notification_subscriptions;
CREATE POLICY "Users can view notification subscriptions"
  ON public.notification_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert notification subscriptions" ON public.notification_subscriptions;
CREATE POLICY "Users can insert notification subscriptions"
  ON public.notification_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update notification subscriptions" ON public.notification_subscriptions;
CREATE POLICY "Users can update notification subscriptions"
  ON public.notification_subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete notification subscriptions" ON public.notification_subscriptions;
CREATE POLICY "Users can delete notification subscriptions"
  ON public.notification_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_user ON public.notification_subscriptions(user_id);

-- ====================================================================
-- 14. INGESTION RUNS
-- Backend ingestion execution logs
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.ingestion_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running',
  sources_processed INTEGER DEFAULT 0,
  articles_ingested INTEGER DEFAULT 0,
  articles_failed INTEGER DEFAULT 0,
  error_summary TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- RLS enabled; no public policies added (internal backend table accessible via service_role)
ALTER TABLE public.ingestion_runs ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 15. AI PROCESSING RUNS
-- Backend AI execution logs
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.ai_processing_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running',
  input_count INTEGER DEFAULT 0,
  output_count INTEGER DEFAULT 0,
  model TEXT,
  prompt_version TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- RLS enabled; no public policies added (internal backend table accessible via service_role)
ALTER TABLE public.ai_processing_runs ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 16. ANALYTICS EVENTS
-- Analytics tracking events
-- ====================================================================
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

-- ====================================================================
-- 17. LIVE LOGS
-- Live radar system logs
-- ====================================================================
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

-- ====================================================================
-- FUNCTIONS & TRIGGERS
-- ====================================================================

-- Function to handle auto profile & default topic provisioning on user sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NULL)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_preferences (user_id, briefing_frequency_hours)
  VALUES (NEW.id, 6)
  ON CONFLICT (user_id) DO NOTHING;

  -- Subscribe to V1 active default topics (Technology & Startups)
  INSERT INTO public.user_topics (user_id, topic_id)
  SELECT NEW.id, t.id FROM public.topics t WHERE t.slug IN ('technology', 'startups')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger on auth.users for new signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Correct set_updated_at function returning NEW
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at timestamps
DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER tr_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_sources_updated_at ON public.sources;
CREATE TRIGGER tr_sources_updated_at
  BEFORE UPDATE ON public.sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_user_story_state_updated_at ON public.user_story_state;
CREATE TRIGGER tr_user_story_state_updated_at
  BEFORE UPDATE ON public.user_story_state
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_notification_subscriptions_updated_at ON public.notification_subscriptions;
CREATE TRIGGER tr_notification_subscriptions_updated_at
  BEFORE UPDATE ON public.notification_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
