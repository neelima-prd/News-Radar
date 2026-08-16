# News Radar V1 — Executive Intelligence Briefings

News Radar is an AI-powered executive news intelligence assistant. It automatically ingests news feeds from curated sources, deduplicates and clusters coverage, ranks top story developments using Gemini AI models, synthesizes 60-second executive briefings, and delivers automated desktop push notifications when new briefings arrive.

## Core Philosophy

> "Stay informed without seeking information."

## Architecture Overview

News Radar V1 operates on a streamlined PostgreSQL database schema via Supabase, with full local file-based fallback (`db.json`) for resilience and offline-first usage.

News Radar uses an externally scheduled hourly HTTP trigger to invoke the Vercel briefing dispatcher (`/api/cron/briefing-dispatcher`). The dispatcher itself determines which users are due for a briefing based on their configured frequency.

### V1 Database Tables

1. **`profiles`** — User profile records and configuration.
2. **`topics`** — Canonical list of supported news intelligence topics.
3. **`user_topics`** — Subscriptions mapping users to their followed topics.
4. **`user_preferences`** — Executive preferences (topics, briefing frequency, notification opt-in).
5. **`sources`** — Verified news publishers and RSS feeds.
6. **`articles`** — Raw ingested news items.
7. **`article_clusters`** — Deduplicated story groups created during ingestion.
8. **`cluster_articles`** — Association mapping raw articles to story clusters.
9. **`briefings`** — Generated executive briefing digests.
10. **`briefing_items`** — Individual synthesized story cards within a briefing digest.
11. **`user_story_state`** — Per-user story read/unread tracking and bookmark states.
12. **`notification_subscriptions`** — W3C Web Push endpoint and VAPID key registrations.

## API Endpoints (V1 Surface)

- `GET /api/health` — Service health probe.
- `GET /api/config` — Public configuration probe for Supabase client & VAPID initialization.
- `GET /api/briefings` — Fetches current and historical executive briefings.
- `POST /api/briefings/generate` — Triggers fresh RSS ingestion and Gemini AI briefing synthesis.
- `GET /api/preferences` — Retrieves user topic subscriptions, briefing frequency, and notification preferences.
- `PUT /api/preferences` — Updates user preferences.
- `GET /api/story_state` — Retrieves read/unread story card states for the user.
- `POST /api/story_state` — Updates read/unread status for a specific briefing story card.
- `POST /api/notifications/subscribe` — Registers a browser Web Push subscription.
- `POST /api/notifications/unsubscribe` — Deactivates a Web Push subscription.
- `POST /api/notifications/test` — Sends an instant test push notification to the user.
- `GET/POST /api/cron/briefing-dispatcher` — Hourly external scheduler endpoint (authenticated via `CRON_SECRET`) that evaluates due users, generates briefings, and dispatches desktop notifications.

## Local Development & Setup

1. Copy `.env.example` to `.env` and set your keys:
   - `GEMINI_API_KEY`
   - `VITE_VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `CRON_SECRET`
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run local dev server:
   ```bash
   npm run dev
   ```
