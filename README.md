# News Radar V1 — Executive Intelligence Briefings

News Radar is an AI-powered executive news intelligence assistant. It automatically ingests news feeds from curated sources, deduplicates and clusters coverage, ranks top story developments using Gemini AI models, and synthesizes 60-second executive briefings.

## Architecture Overview

News Radar V1 operates on a streamlined, 11-table PostgreSQL database schema via Supabase, with full local file-based fallback (`db.json`) for serverless and offline resilience.

### Final V1 11-Table Database Schema

1. **`profiles`** — User profile records and configuration.
2. **`topics`** — Canonical list of supported news intelligence topics.
3. **`user_topics`** — Subscriptions mapping users to their followed topics.
4. **`user_preferences`** — Executive preferences (topics, briefing frequency).
5. **`sources`** — Verified news publishers and RSS feeds.
6. **`articles`** — Raw ingested news items.
7. **`article_clusters`** — Deduplicated story groups created during ingestion.
8. **`cluster_articles`** — Association mapping raw articles to story clusters.
9. **`briefings`** — Generated executive briefing digests.
10. **`briefing_items`** — Individual synthesized story cards within a briefing digest.
11. **`user_story_state`** — Per-user story read/unread tracking and bookmark states.

## API Endpoints (V1 Surface)

- `GET /api/health` — Service health probe.
- `GET /api/config` — Public configuration probe for Supabase client initialization.
- `GET /api/briefings` — Fetches current and historical executive briefings.
- `POST /api/briefings/generate` — Triggers fresh RSS ingestion and Gemini AI briefing synthesis.
- `GET /api/preferences` — Retrieves user topic subscriptions and briefing frequency settings.
- `PUT /api/preferences` — Updates user topic subscriptions and briefing frequency.
- `GET /api/story_state` — Retrieves read/unread story card states for the authenticated user.
- `POST /api/story_state` — Updates read/unread status for a specific briefing story card.

## Local Development & Setup

1. Copy `.env.example` to `.env` and set `GEMINI_API_KEY`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run local dev server:
   ```bash
   npm run dev
   ```

## Supabase Verification

To verify your live Supabase database against the 11-table V1 architecture:
```sql
-- Execute in Supabase SQL Editor:
\i supabase/verify_v1.sql
```
