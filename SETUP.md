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

## 3. Scheduled Briefing Dispatcher Configuration (External Scheduler)

News Radar uses an externally scheduled hourly HTTP trigger to invoke the Vercel briefing dispatcher. The dispatcher itself determines which users are due for a briefing based on their configured frequency (`briefing_frequency_hours`: 3, 6, 12, or 24 hours).

### Dispatcher Endpoint Details:
- **URL**: `https://newsradar-brief.vercel.app/api/cron/briefing-dispatcher`
- **HTTP Method**: `GET` or `POST`
- **Header**: `Authorization: Bearer <YOUR_CRON_SECRET>`
- **Recommended Schedule**: Every hour (`0 * * * *`)

### Setting up an External Scheduler:
You can use any free cron service (e.g. [cron-job.org](https://cron-job.org), GitHub Actions, or EasyCron) to hit the endpoint hourly:

1. **URL**: `https://newsradar-brief.vercel.app/api/cron/briefing-dispatcher`
2. **Schedule**: Hourly (`0 * * * *` or every 60 minutes)
3. **HTTP Header**:
   ```
   Authorization: Bearer <CRON_SECRET>
   ```

### Execution Flow:
1. The external cron hits `/api/cron/briefing-dispatcher`.
2. The endpoint validates `Authorization: Bearer <CRON_SECRET>`.
3. It queries all users whose `notifications_enabled = true` and whose last briefing is older than their configured `briefing_frequency_hours` (3, 6, 12, or 24 hours).
4. For each due user, it generates a fresh intelligence briefing and delivers a desktop push notification via Web Push.
5. Users configured for 6, 12, or 24 hours are safely evaluated and skipped if their interval has not yet elapsed (idempotent duplicate protection).
6. Invalid/expired endpoints (HTTP 410 / 404) are automatically marked inactive in the database.

---

## 4. Manual Test with cURL

You can test the dispatcher at any time using cURL:

```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://newsradar-brief.vercel.app/api/cron/briefing-dispatcher
```

Expected responses:
- **Valid Secret & Success**:
  ```json
  {"ok": true, "processedCount": 1, "results": [{"userId": "...", "briefingId": "...", "pushed": true}]}
  ```
- **Valid Secret & No Users Due**:
  ```json
  {"ok": true, "processedCount": 0, "results": []}
  ```
- **Unauthorized / Invalid Secret**:
  ```json
  {"error": "Unauthorized cron execution."}
  ```

---

## 5. Running the Application Locally

```bash
npm install
npm run build
npm run start
```
