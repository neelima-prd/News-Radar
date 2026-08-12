-- ====================================================================
-- NEWS RADAR V1 - COMPREHENSIVE DATABASE AUDIT & VERIFICATION SCRIPT
-- ====================================================================

-- 1. VERIFY ALL 17 EXPECTED TABLES EXIST IN INFORMATION_SCHEMA
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles',
    'topics',
    'user_topics',
    'user_preferences',
    'sources',
    'articles',
    'article_clusters',
    'cluster_articles',
    'briefings',
    'briefing_items',
    'user_story_state',
    'feedback',
    'notification_subscriptions',
    'ingestion_runs',
    'ai_processing_runs',
    'analytics_events',
    'live_logs'
  )
ORDER BY table_name;

-- 2. VERIFY ROW LEVEL SECURITY (RLS) STATUS ON ALL TABLES
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY c.relname;

-- 3. VERIFY REGISTERED RLS POLICIES
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 4. VERIFY FOREIGN KEY CONSTRAINTS
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON rc.unique_constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 5. VERIFY ACTIVE TRIGGERS AND TRIGGER FUNCTIONS
SELECT
  trigger_name,
  event_object_table,
  action_statement,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public' OR event_object_table = 'users'
ORDER BY event_object_table, trigger_name;

-- 6. VERIFY COLUMN DATA TYPES FOR CORE TABLES
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
