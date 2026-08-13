# News Radar V1 — Setup & Database Migration Guide

## Prerequisites
- Node.js 18+
- Google Gemini API Key (`GEMINI_API_KEY`)
- Supabase Project (URL and Anon Key)

## Database Setup & Migration Manual Workflow (Supabase)

For fresh deployments, run `/supabase/schema.sql` directly in your Supabase SQL Editor.

For existing Supabase deployments, follow these exact manual steps in the Supabase SQL Editor:

### Step 1: Pre-Migration Safety Check
Execute `supabase/pre_migration_check.sql` in the Supabase SQL Editor.

### Step 2: Review Inspection Output
Review the output to confirm:
- `user_preferences.notifications_enabled` column status.
- Deferred tables (`feedback`, `notification_subscriptions`, `ingestion_runs`, `ai_processing_runs`, `analytics_events`, `live_logs`) status and estimated row counts.
- Confirm `SAFE_TO_DROP` is `YES` and no core V1 tables depend on deferred tables.

### Step 3: Run Migration 03
If no unexpected data or dependencies exist, manually execute:
`supabase/migrations/03_finalize_v1_11_table_schema.sql`

### Step 4: Run Verification Audit
Execute `supabase/verify_v1.sql` in the Supabase SQL Editor.

### Step 5: Confirm Results
Verify that the audit output reports:
`CORE TABLES: 11/11 PASS`
and all deferred tables report `ABSENT`.

## Environment Configuration
Set the following variables in your environment or hosting platform:
```env
GEMINI_API_KEY=your_gemini_api_key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Running the Application
```bash
npm install
npm run build
npm run start
```
