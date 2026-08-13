# News Radar V1 — Setup & Database Migration Guide

## Prerequisites
- Node.js 18+
- Google Gemini API Key (`GEMINI_API_KEY`)
- Optional: Supabase Project (URL and Anon Key)

## Database Setup (Supabase)

### 1. Apply Schema
To initialize the production V1 database with all 11 tables, execute `/supabase/schema.sql` in your Supabase SQL Editor.

### 2. Optional: Migration for Existing Databases
If upgrading an existing database from earlier builds, run `/supabase/migrations/03_finalize_v1_11_table_schema.sql` in your Supabase SQL Editor.
*Note: This script safely drops unused columns and deferred tables (`feedback`, `notification_subscriptions`, `ingestion_runs`, `ai_processing_runs`, `analytics_events`, `live_logs`).*

### 3. Database Verification
Execute `/supabase/verify_v1.sql` in your Supabase SQL Editor. Ensure all checks return `PASS`.

## Environment Configuration
Set the following variables in your environment or Vercel dashboard:
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
