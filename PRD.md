# News Radar V1 — Product Requirement Document (PRD)

## Product Vision
News Radar empowers busy executives and technology leaders to stay informed without seeking information. It turns unstructured RSS news streams into actionable, 60-second executive briefings.

## V1 Scope & Core Features
- **Curated News Ingestion**: Scrapes TechCrunch, Hacker News, and CNBC Business RSS feeds with internal seed backup pools.
- **AI Synthesis**: Uses Google Gemini models (`gemini-2.5-flash`) to deduplicate news stories, cluster related coverage, rank top updates, and generate concise summary points and strategic "Why This Matters" insights.
- **Executive UI**: Responsive, dual-theme (dark/light) workspace presenting top stories, coverage sources, reading queue progress, and archive digests.
- **User Preference Management**: Topic selection and customizable briefing frequencies (3, 6, 12, 24 hours).
- **Read State Persistence**: Tracks story read/unread progress across sessions via Supabase `user_story_state` table or local cache.
- **Automated Desktop Notifications**: Web Push + VAPID notifications triggered via external hourly scheduler (`/api/cron/briefing-dispatcher`) delivering executive briefings directly to the desktop when due.

## Data Model (12 V1 Tables)
1. `profiles`
2. `topics`
3. `user_topics`
4. `user_preferences`
5. `sources`
6. `articles`
7. `article_clusters`
8. `cluster_articles`
9. `briefings`
10. `briefing_items`
11. `user_story_state`
12. `notification_subscriptions`

## Deferred Scope (V1.1 / V2)
Feedback tracking, granular ingestion run logs, AI processing step metrics, analytics event logging, and live radar logs have been deferred to post-V1 iterations.
