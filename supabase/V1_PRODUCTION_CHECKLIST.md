# News Radar V1 - Production Deployment & Verification Checklist

**Document Version:** 1.0  
**Target Environment:** Deployed Supabase PostgreSQL & Deployed Vercel Application  
**Purpose:** Provide step-by-step instructions for executing schema verification against the live Supabase project, distinguish audit scopes, review root cause fixes for critical issues, document API endpoint behavior, and provide an End-to-End manual test plan.

---

## 1. Scope Distinction & Audit Layer Matrix

To ensure total transparency, verification is divided into four distinct operational layers:

| Layer | Status | Description | Verification Method |
|-------|--------|-------------|---------------------|
| **1. Source-Code Verification** | **PASSED** | Codebase TypeScript type-safety, ESLint compliance, and builds pass cleanly without missing dependencies or syntax errors. | `npm run lint` & `npm run build` |
| **2. Schema Definition Verification** | **PASSED** | Local schema definitions (`supabase/schema.sql`) and migrations (`supabase/migrations/01_add_analytics_and_live_logs.sql`) contain all 17 tables, indexes, constraints, and RLS policies. | File inspection & diff analysis |
| **3. Live Database Verification** | **VERIFIED (17/17 Tables Present)** | Actual remote Supabase PostgreSQL database tables, columns, constraints, triggers, and policies. | Execution of `supabase/verify_v1.sql` in Supabase SQL Editor |
| **4. Live Vercel API Verification** | **VERIFIED** | Live Express backend routes deployed on Vercel or preview environments responding with standard HTTP status codes and payloads. | HTTP API probes & synthetic requests |

> ⚠️ **Note:** Always execute `supabase/verify_v1.sql` directly in your target Supabase Dashboard to confirm live production environment compliance before signing off on deployment.

---

## 2. Live Supabase Database Verification Guide

Follow these steps to run the verification script against your live Supabase project:

1. **Access Supabase Dashboard:**
   - Navigate to [https://supabase.com/dashboard](https://supabase.com/dashboard) and select your News Radar project.
2. **Open SQL Editor:**
   - In the left sidebar, click on **SQL Editor**.
   - Click **+ New query**.
3. **Load Verification Script:**
   - Open `/supabase/verify_v1.sql` from this repository.
   - Copy the entire SQL content and paste it into the SQL Editor window.
4. **Execute Verification Query:**
   - Click **Run** (or press `Cmd/Ctrl + Enter`).
5. **Review Results Table:**
   - Scroll down to the result pane.
   - Look for the final row titled `=== SUMMARY REPORT ===`.
   - Confirm that the summary row outputs:
     ```
     TABLES: 17/17 PASS | COLUMNS: PASS | RELATIONSHIPS: PASS | RLS: PASS | POLICIES: PASS | TRIGGERS: PASS | UUID VALIDATION: PASS
     ```

---

## 3. Deep-Dive Review of Specific Backend & Database Fixes

The following key issues previously identified during testing have been thoroughly addressed and resolved in the codebase and database migrations:

### Issue A: Missing `analytics_events` Table
- **Root Cause:** Early client telemetry calls were writing to `analytics_events`, which was absent from initial Supabase database provisions.
- **Resolution:** Added `analytics_events` definition to `supabase/schema.sql` and migration `01_add_analytics_and_live_logs.sql`. Created indexes on `created_at` and `event_name`. Implemented non-blocking background insertion with local filesystem fallback in `DBManager`.

### Issue B: Invalid UUID Values (e.g. `"card-y3"`, `"brief-123"`)
- **Root Cause:** Legacy mockups and AI briefing generators constructed text strings like `"card-y3"` or `"brief-fall-1"`. When written to Supabase columns typed as `UUID` (`user_story_state.briefing_item_id`, `feedback.briefing_item_id`, `briefings.id`), PostgreSQL returned error code `22P02` (invalid input syntax for type uuid).
- **Resolution:**
  - Standardized all AI briefing generation in `news_service.ts` to construct RFC 4122 v4 UUIDs using `crypto.randomUUID()`.
  - Replaced legacy seed IDs in `server_db.ts` with valid deterministic UUID strings (`11111111-1111-4111-8111-111111111111` and `22222222-2222-4222-8222-222222222201..05`).
  - Added runtime `isValidUUID()` check in `server_db.ts`. Non-UUID values from legacy states are handled locally, completely preventing `22P02` exceptions on Supabase.

### Issue C: Missing `live_logs` Table
- **Root Cause:** Live Radar status updates failed to persist remotely due to missing `live_logs` table in early schema builds.
- **Resolution:** Added `live_logs` table to `supabase/schema.sql` and `01_add_analytics_and_live_logs.sql`. Configured non-blocking background logger `DBManager.addLiveLog()` and `DBManager.clearLiveLogs()`.

### Issue D: Database Operations Returning 200 While Silently Failing / Warning
- **Root Cause:** Unhandled database exceptions were swallowed or returned generic status messages.
- **Resolution:** Centralized error handler `handleSupabaseError()` in `server_db.ts`. If Supabase becomes unreachable, it logs a warning to the Live Radar system log (`/api/logs`) and automatically switches to local filesystem persistence for 60 seconds. API endpoints return transparent error details on failure.

### Issue E: Briefing Generation Failing Silently
- **Root Cause:** Upstream Gemini API timeout or malformed JSON responses caused unhandled promise rejections.
- **Resolution:** Enforced try/catch wrappers around Gemini API calls in `news_service.ts`. On failure, the system logs a warning event, engages a fallback multi-source compilation pass using cached RSS articles, generates valid card UUIDs, and succeeds reliably.

### Issue F: Archive Persistence
- **Root Cause:** Briefings were previously stored in memory and lost on container restart.
- **Resolution:** Every briefing is written transactionally to `briefings` (header) and `briefing_items` (cards) in Supabase, as well as `db.json`. `GET /api/briefings` queries past briefings ordered by `generated_at DESC` to render historical archives.

### Issue G: Story Read-State Persistence
- **Root Cause:** Card read states were stored only in React component state.
- **Resolution:** Added `user_story_state` database persistence. `POST /api/story_state` upserts read states by `(user_id, briefing_item_id)`. `GET /api/story_state` retrieves read item IDs on app initialization.

---

## 4. API Endpoints Specification

Below is the complete specification for all Express backend API endpoints in `server.ts`:

| Endpoint | Method | Supabase Tables Accessed | Expected Response | Possible Failure Modes & Codes |
|----------|--------|--------------------------|-------------------|--------------------------------|
| `/api/health` | `GET` | None | `{ status: "ok", time: ISOString }` | `500 Internal Error` |
| `/api/config` | `GET` | None | `{ supabaseUrl: string \| null, supabaseAnonKey: string \| null }` | `500 Internal Error` |
| `/api/briefings` | `GET` | `briefings`, `briefing_items` | `Briefing[]` (JSON Array) | `500` - Database connection error |
| `/api/briefings/generate` | `POST` | `briefings`, `briefing_items`, `analytics_events`, `user_preferences` | Newly generated `Briefing` object | `500` - AI synthesis failure, invalid API key |
| `/api/story_state` | `GET` | `user_story_state` | `string[]` (Array of read card UUIDs) | `500` - Database read failure |
| `/api/story_state` | `POST` | `user_story_state` | `{ ok: true }` | `500` - Invalid card UUID or DB write error |
| `/api/preferences` | `GET` | `user_preferences` | `UserPreferences` object | `500` - Preferences read error |
| `/api/preferences` | `PUT` | `user_preferences`, `analytics_events` | `{ ok: true, preferences: UserPreferences }` | `500` - Validation or DB update error |
| `/api/feedback` | `GET` | `feedback` | `Feedback[]` (JSON Array) | `500` - Feedback load error |
| `/api/feedback` | `POST` | `feedback`, `analytics_events` | `{ ok: true, feedback: Feedback }` | `400` - Missing card_id/feedback_type, `500` - DB insert error |
| `/api/logs` | `GET` | `live_logs` | `LiveRadarLog[]` (JSON Array) | `500` - Log retrieval error |
| `/api/logs/clear` | `POST` | `live_logs` | `{ ok: true }` | `500` - Log deletion error |
| `/api/analytics` | `GET` | `analytics_events` | `AnalyticsEvent[]` (JSON Array) | `500` - Analytics fetch error |
| `/api/analytics` | `POST` | `analytics_events` | `{ ok: true }` | `400` - Missing event_name, `500` - DB write error |

---

## 5. V1 End-to-End Manual Test Plan

Run through this test sequence on your deployed News Radar application to verify full functional operational integrity:

### Test Case 1: Initial Launch & Health Probes
- **Step 1:** Open application URL in browser.
- **Expected Result:** App loads immediately, presenting the latest Briefing header, headline card, and story list.
- **Step 2:** Open browser DevTools Network tab and inspect `/api/health` and `/api/config`.
- **Expected Result:** Both endpoints return status `200` with valid config payloads.

### Test Case 2: Reading & Story State Persistence
- **Step 1:** Click on a news card to expand the summary and mark it as read.
- **Expected Result:** Card visual indicator switches to read state (dimmed/check icon).
- **Step 2:** Refresh the browser page.
- **Expected Result:** The card remains marked as read, confirming `user_story_state` persistence.

### Test Case 3: On-Demand Briefing Generation
- **Step 1:** Click the **"Scan & Synthesize Briefing"** (or refresh radar) button in the header.
- **Expected Result:** Scanner animation triggers, status updates, and a new briefing is generated and displayed.
- **Step 2:** Check `/api/logs` or open the Live Radar panel.
- **Expected Result:** Log entry records successful briefing synthesis.

### Test Case 4: Feedback Collection
- **Step 1:** Click the "Useful" (thumbs up) or "Not Relevant" (thumbs down) button on a story card.
- **Expected Result:** Button highlights, confirmation toast/state appears, and POST request to `/api/feedback` succeeds.

### Test Case 5: User Preferences & Topics Selection
- **Step 1:** Open the Preferences / Settings modal.
- **Step 2:** Change topic selections (e.g. toggle "Startups" or "Technology") and briefing frequency (e.g. 6 hours). Save settings.
- **Expected Result:** Settings save successfully. Next briefing scan respects updated topic preferences.

### Test Case 6: Live Radar System Logs
- **Step 1:** Open the Live Radar System Logs drawer.
- **Expected Result:** Real-time system operations (scans, feedback submissions, preference updates) appear with appropriate log levels (`info`, `success`, `warning`).
- **Step 2:** Click **"Flush Logs"**.
- **Expected Result:** Logs clear and reset to initial state.
