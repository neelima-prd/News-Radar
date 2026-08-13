-- ====================================================================
-- NEWS RADAR V1 - PRODUCTION DATABASE VERIFICATION SCRIPT (FINAL 11-TABLE VERSION)
-- ====================================================================
-- Instructions: Run this script directly in the Supabase SQL Editor.
-- It executes automated schema, constraint, trigger, and RLS checks
-- across the 11 core V1 tables and outputs a unified audit report.
-- ====================================================================

WITH expected_tables AS (
  SELECT unnest(ARRAY[
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
    'user_story_state'
  ]) AS table_name
),

-- 1. Table Existence Check (11 Core V1 Tables)
table_checks AS (
  SELECT
    'TABLES' AS category,
    et.table_name AS check_target,
    CASE
      WHEN t.table_name IS NOT NULL THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    CASE
      WHEN t.table_name IS NOT NULL THEN 'Table exists in public schema'
      ELSE 'MISSING TABLE: ' || et.table_name
    END AS details
  FROM expected_tables et
  LEFT JOIN information_schema.tables t
    ON t.table_schema = 'public' AND t.table_name = et.table_name
),

-- 2. Core Columns & Data Type Verification
column_assertions AS (
  SELECT * FROM (VALUES
    ('profiles', 'id', 'uuid', 'NO'),
    ('profiles', 'display_name', 'text', 'YES'),
    ('topics', 'id', 'uuid', 'NO'),
    ('topics', 'slug', 'text', 'NO'),
    ('user_topics', 'user_id', 'uuid', 'NO'),
    ('user_topics', 'topic_id', 'uuid', 'NO'),
    ('user_preferences', 'user_id', 'uuid', 'NO'),
    ('user_preferences', 'briefing_frequency_hours', 'integer', 'YES'),
    ('sources', 'id', 'uuid', 'NO'),
    ('sources', 'name', 'text', 'NO'),
    ('articles', 'id', 'uuid', 'NO'),
    ('articles', 'url', 'text', 'NO'),
    ('article_clusters', 'id', 'uuid', 'NO'),
    ('cluster_articles', 'cluster_id', 'uuid', 'NO'),
    ('cluster_articles', 'article_id', 'uuid', 'NO'),
    ('briefings', 'id', 'uuid', 'NO'),
    ('briefings', 'generated_at', 'TIMESTAMP WITH TIME ZONE', 'YES'),
    ('briefing_items', 'id', 'uuid', 'NO'),
    ('briefing_items', 'briefing_id', 'uuid', 'NO'),
    ('briefing_items', 'rank', 'integer', 'NO'),
    ('briefing_items', 'priority', 'text', 'YES'),
    ('user_story_state', 'user_id', 'uuid', 'NO'),
    ('user_story_state', 'briefing_item_id', 'uuid', 'NO'),
    ('user_story_state', 'status', 'text', 'YES')
  ) AS t(table_name, column_name, expected_type, is_nullable)
),

column_checks AS (
  SELECT
    'COLUMNS' AS category,
    ca.table_name || '.' || ca.column_name AS check_target,
    CASE
      WHEN c.column_name IS NULL THEN 'FAIL'
      WHEN UPPER(c.data_type) = UPPER(ca.expected_type) OR c.udt_name = LOWER(ca.expected_type) OR (ca.expected_type LIKE 'TIMESTAMP%' AND c.data_type LIKE 'timestamp%') THEN 'PASS'
      ELSE 'WARNING'
    END AS status,
    CASE
      WHEN c.column_name IS NULL THEN 'Missing column'
      ELSE 'Found type: ' || c.data_type || ' (expected: ' || ca.expected_type || ')'
    END AS details
  FROM column_assertions ca
  LEFT JOIN information_schema.columns c
    ON c.table_schema = 'public' AND c.table_name = ca.table_name AND c.column_name = ca.column_name
),

-- 3. Row Level Security (RLS) Verification
rls_checks AS (
  SELECT
    'RLS' AS category,
    et.table_name AS check_target,
    CASE
      WHEN c.relrowsecurity = TRUE THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    CASE
      WHEN c.relrowsecurity = TRUE THEN 'RLS enabled'
      ELSE 'RLS NOT ENABLED'
    END AS details
  FROM expected_tables et
  LEFT JOIN pg_class c ON c.relname = et.table_name
  LEFT JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
),

-- 4. Foreign Keys & Delete Behavior Check
fk_assertions AS (
  SELECT * FROM (VALUES
    ('profiles', 'id', 'auth.users', 'CASCADE'),
    ('user_topics', 'user_id', 'auth.users', 'CASCADE'),
    ('user_topics', 'topic_id', 'topics', 'CASCADE'),
    ('user_preferences', 'user_id', 'auth.users', 'CASCADE'),
    ('briefing_items', 'briefing_id', 'briefings', 'CASCADE'),
    ('user_story_state', 'briefing_item_id', 'briefing_items', 'CASCADE')
  ) AS t(table_name, column_name, foreign_table, delete_rule)
),

fk_checks AS (
  SELECT
    'RELATIONSHIPS' AS category,
    fa.table_name || '.' || fa.column_name || ' -> ' || fa.foreign_table AS check_target,
    CASE
      WHEN kcu.column_name IS NOT NULL AND UPPER(rc.delete_rule) = UPPER(fa.delete_rule) THEN 'PASS'
      WHEN kcu.column_name IS NOT NULL THEN 'WARNING'
      ELSE 'FAIL'
    END AS status,
    CASE
      WHEN kcu.column_name IS NULL THEN 'Foreign key missing'
      ELSE 'Delete rule: ' || rc.delete_rule || ' (expected: ' || fa.delete_rule || ')'
    END AS details
  FROM fk_assertions fa
  LEFT JOIN information_schema.table_constraints tc
    ON tc.table_schema = 'public' AND tc.table_name = fa.table_name AND tc.constraint_type = 'FOREIGN KEY'
  LEFT JOIN information_schema.key_column_usage kcu
    ON kcu.constraint_name = tc.constraint_name AND kcu.column_name = fa.column_name
  LEFT JOIN information_schema.referential_constraints rc
    ON rc.constraint_name = tc.constraint_name
),

-- 5. RLS Policies Check
policy_checks AS (
  SELECT
    'POLICIES' AS category,
    et.table_name AS check_target,
    CASE
      WHEN count(p.policyname) > 0 THEN 'PASS'
      WHEN et.table_name IN ('sources', 'articles', 'article_clusters', 'cluster_articles') THEN 'PASS' -- Service Role restricted backend tables
      ELSE 'WARNING'
    END AS status,
    CASE
      WHEN count(p.policyname) > 0 THEN count(p.policyname)::text || ' policy/policies defined'
      WHEN et.table_name IN ('sources', 'articles', 'article_clusters', 'cluster_articles') THEN 'Restricted to Service Role (No public client policy required)'
      ELSE 'No client policies defined'
    END AS details
  FROM expected_tables et
  LEFT JOIN pg_policies p ON p.schemaname = 'public' AND p.tablename = et.table_name
  GROUP BY et.table_name
),

-- 6. Triggers Check
trigger_assertions AS (
  SELECT * FROM (VALUES
    ('auth.users', 'on_auth_user_created'),
    ('profiles', 'tr_profiles_updated_at'),
    ('user_preferences', 'tr_user_preferences_updated_at'),
    ('sources', 'tr_sources_updated_at'),
    ('user_story_state', 'tr_user_story_state_updated_at')
  ) AS t(event_table, trigger_name)
),

trigger_checks AS (
  SELECT
    'TRIGGERS' AS category,
    ta.event_table || ' [' || ta.trigger_name || ']' AS check_target,
    CASE
      WHEN tr.trigger_name IS NOT NULL THEN 'PASS'
      ELSE 'WARNING'
    END AS status,
    CASE
      WHEN tr.trigger_name IS NOT NULL THEN 'Trigger active'
      ELSE 'Trigger not found'
    END AS details
  FROM trigger_assertions ta
  LEFT JOIN information_schema.triggers tr
    ON tr.trigger_name = ta.trigger_name
),

-- 7. UUID Compatibility Check
uuid_checks AS (
  SELECT
    'UUID VALIDATION' AS category,
    c.table_name || '.' || c.column_name AS check_target,
    CASE
      WHEN c.data_type = 'uuid' THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    'Data type is ' || c.data_type AS details
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.column_name IN ('id', 'user_id', 'briefing_id', 'briefing_item_id', 'source_id', 'topic_id', 'cluster_id', 'article_id')
    AND c.table_name IN ('profiles', 'user_preferences', 'briefings', 'briefing_items', 'user_story_state')
),

-- 8. Check for Presence of Deferred Future-Scope Tables
deferred_tables AS (
  SELECT unnest(ARRAY[
    'feedback',
    'notification_subscriptions',
    'ingestion_runs',
    'ai_processing_runs',
    'analytics_events',
    'live_logs'
  ]) AS table_name
),

deferred_checks AS (
  SELECT
    'DEFERRED TABLES' AS category,
    dt.table_name AS check_target,
    CASE
      WHEN t.table_name IS NOT NULL THEN 'WARNING'
      ELSE 'PASS'
    END AS status,
    CASE
      WHEN t.table_name IS NOT NULL THEN 'Deferred table still present in database (Execute migration 03 to drop)'
      ELSE 'Deferred table absent (V1 aligned)'
    END AS details
  FROM deferred_tables dt
  LEFT JOIN information_schema.tables t
    ON t.table_schema = 'public' AND t.table_name = dt.table_name
),

-- Consolidated Detailed Findings
all_checks AS (
  SELECT * FROM table_checks
  UNION ALL
  SELECT * FROM column_checks
  UNION ALL
  SELECT * FROM rls_checks
  UNION ALL
  SELECT * FROM fk_checks
  UNION ALL
  SELECT * FROM policy_checks
  UNION ALL
  SELECT * FROM trigger_checks
  UNION ALL
  SELECT * FROM uuid_checks
  UNION ALL
  SELECT * FROM deferred_checks
),

-- Summary Rollup Block
summary AS (
  SELECT
    '=== SUMMARY REPORT ===' AS category,
    'SYSTEM OVERALL AUDIT' AS check_target,
    CASE
      WHEN count(*) FILTER (WHERE category != 'DEFERRED TABLES' AND status = 'FAIL') = 0 THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    'TABLES: ' || (SELECT count(*) FROM table_checks WHERE status = 'PASS')::text || '/11 PASS | ' ||
    'COLUMNS: ' || (CASE WHEN (SELECT count(*) FROM column_checks WHERE status = 'FAIL') = 0 THEN 'PASS' ELSE 'FAIL' END) || ' | ' ||
    'RELATIONSHIPS: ' || (CASE WHEN (SELECT count(*) FROM fk_checks WHERE status = 'FAIL') = 0 THEN 'PASS' ELSE 'FAIL' END) || ' | ' ||
    'RLS: ' || (CASE WHEN (SELECT count(*) FROM rls_checks WHERE status = 'FAIL') = 0 THEN 'PASS' ELSE 'FAIL' END) || ' | ' ||
    'POLICIES: ' || (CASE WHEN (SELECT count(*) FROM policy_checks WHERE status = 'FAIL') = 0 THEN 'PASS' ELSE 'FAIL' END) || ' | ' ||
    'TRIGGERS: ' || (CASE WHEN (SELECT count(*) FROM trigger_checks WHERE status = 'FAIL') = 0 THEN 'PASS' ELSE 'WARN' END) || ' | ' ||
    'DEFERRED TABLES PRESENT: ' || COALESCE((SELECT string_agg(check_target, ', ') FROM deferred_checks WHERE status = 'WARNING'), 'NONE (CLEAN V1)') AS details
  FROM all_checks
)

-- Final Formatted Output Stream
SELECT category, check_target, status, details FROM all_checks
UNION ALL
SELECT category, check_target, status, details FROM summary;
