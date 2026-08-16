# News Radar V1 — Setup & Database Migration Guide

## Prerequisites
- Node.js 18+
- Google Gemini API Key (`GEMINI_API_KEY`)
- Supabase Project (URL and Anon Key)
- Web Push VAPID Keypair (generated via `npx web-push generate-vapid-keys`)

---

## 1. Generating VAPID Keys for Desktop Notifications

Run the following command to generate a new pair of VAPID keys:
```bash
npx web-push generate-vapid-keys
```

Add the generated keys to your `.env` and Vercel Environment Variables:
```env
VITE_VAPID_PUBLIC_KEY=BL9x...
VAPID_PRIVATE_KEY=3k...
VAPID_SUBJECT=mailto:admin@yourdomain.com
CRON_SECRET=your-secure-cron-token
```

---

## 2. Database Setup & Migration (Supabase)

### For Fresh Deployments:
Run `/supabase/schema.sql` directly in your Supabase SQL Editor.

### For Existing Supabase Deployments:
Execute the notification restore migration in the Supabase SQL Editor:
`supabase/migrations/04_restore_v1_notifications.sql`

This migration creates:
- `notification_subscriptions` table with RLS policies
- `user_preferences.notifications_enabled` column

---

## 3. Vercel Cron Configuration

Vercel Cron is automatically configured via `vercel.json` to trigger every hour:
```json
{
  "crons": [
    {
      "path": "/api/cron/briefing-dispatcher",
      "schedule": "0 * * * *"
    }
  ]
}
```

When triggered:
1. The cron endpoint verifies the `Authorization: Bearer <CRON_SECRET>` header.
2. It queries all users whose `notifications_enabled = true` and whose last briefing is older than their configured `briefing_frequency_hours` (3, 6, 12, or 24 hours).
3. For each due user, it generates a fresh intelligence briefing and delivers a desktop push notification via Web Push.
4. Invalid/expired endpoints (HTTP 410 / 404) are automatically marked inactive in the database.

---

## 4. Running the Application

```bash
npm install
npm run build
npm run start
```
