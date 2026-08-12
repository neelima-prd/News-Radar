# News Radar V1 - Supabase Setup & Operations Guide

This guide provides complete instructions for provisioning and configuring a fresh Supabase instance for **News Radar V1**, including Supabase Anonymous Authentication, Row Level Security (RLS), and database trigger automation.

---

## 1. Create a New Supabase Project

1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **New Project**.
3. Select your organization, enter project name `News Radar V1`, and generate a secure database password.
4. Select your preferred Cloud Region and click **Create New Project**.
5. Wait ~1 minute for the database and services to initialize.

---

## 2. Enable Supabase Anonymous Authentication

> **CRITICAL STEP:** `schema.sql` creates database tables and policies, but **Anonymous Auth must be manually enabled in the Supabase Dashboard UI**.

1. In your Supabase Dashboard left menu, navigate to **Authentication** -> **Providers**.
2. Scroll down to the **Anonymous** provider section.
3. Toggle **Allow Anonymous Sign-Ins** to **ENABLED**.
4. Click **Save**.

---

## 3. Run the Production Database Schema SQL

1. In the Supabase Dashboard, navigate to **SQL Editor** in the left menu.
2. Click **New Query**.
3. Open the file `supabase/schema.sql` from your project folder, copy all contents, and paste them into the SQL Editor.
4. Click **Run** (or press `Cmd + Enter` / `Ctrl + Enter`).
5. Verify that all 15 tables (`profiles`, `topics`, `user_topics`, `user_preferences`, `sources`, `articles`, `article_clusters`, `cluster_articles`, `briefings`, `briefing_items`, `user_story_state`, `feedback`, `notification_subscriptions`, `ingestion_runs`, `ai_processing_runs`) and trigger functions were created successfully.

---

## 4. Obtain Project Credentials

1. In your Supabase Dashboard, navigate to **Project Settings** -> **API**.
2. Locate:
   - **Project URL** (e.g., `https://your-project-id.supabase.co`)
   - **anon / public key** (e.g., `eyJhbGciOiJIUzI1NiIsInR5cCI6...`)
   - **service_role key** (keep secret; server-side only)

---

## 5. Configure Environment Variables

For local development, create or edit `.env`. For production deployments on **Vercel**, configure these variables under **Vercel → Project Settings → Environment Variables**:

```env
# ====================================================================
# PUBLIC / FRONTEND SAFE (Exposed in browser bundle)
# ====================================================================
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...

# ====================================================================
# SERVER ONLY / SECRET (NEVER send or expose to client browser)
# ====================================================================
GEMINI_API_KEY=AIzaSy...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

---

## 6. Verification Steps

### A. Test Anonymous Session & Profile Creation
1. Open the application in a browser or incognito window.
2. Open Browser DevTools -> Application -> Local Storage.
3. Observe that a Supabase auth token is created automatically without asking for credentials.
4. Query the database in Supabase SQL Editor:
   ```sql
   SELECT * FROM public.profiles;
   ```
   Confirm a profile record exists with `display_name = NULL`.

### B. Test Topic Preferences
1. In the sidebar, click **Preferences**.
2. Toggle between **Technology** and **Startups**.
3. Verify that changes persist instantly and are stored in `public.user_preferences` and `public.user_topics`.

### C. Test Story Read State Persistence
1. On any briefing card, click **Mark as Read**.
2. Check that the UI updates progress, the story queue shows a checkmark, and refresh the browser tab.
3. Verify the card remains marked as read across page refreshes.
4. Verify in Supabase SQL Editor:
   ```sql
   SELECT * FROM public.user_story_state;
   ```
   Confirm `status = 'read'` is recorded for your `user_id`.

### D. Test Feedback
1. Click **Useful** or **Not Relevant** on a briefing update.
2. Verify in Supabase SQL Editor:
   ```sql
   SELECT * FROM public.feedback;
   ```
   Confirm duplicate feedback calls are prevented by constraint `uq_user_briefing_feedback`.

### E. Verify RLS Isolation
1. Verify that internal tables (`sources`, `articles`, `article_clusters`, `cluster_articles`, `ingestion_runs`, `ai_processing_runs`) have RLS enabled and cannot be directly queried by anonymous frontend users.
2. Verify user-owned tables restrict SELECT/UPDATE strictly to `auth.uid()`.

---

## 7. Troubleshooting Common Issues

| Problem | Cause | Solution |
| :--- | :--- | :--- |
| `AuthApiError: Anonymous sign-ins are disabled` | Anonymous provider is toggled OFF in Dashboard | Go to **Auth** -> **Providers** -> **Anonymous** and toggle **ENABLED**. |
| `new row violates row-level security policy` | User token missing or invalid `auth.uid()` | Ensure Supabase client initializes and calls `signInAnonymously()` before executing database queries. |
| `GEMINI_API_KEY environment variable missing` | Missing Gemini key | Add `GEMINI_API_KEY` to `.env` or Vercel Project Settings and restart the dev server / redeploy. |
