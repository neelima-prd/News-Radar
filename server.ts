/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { DBManager, DatabaseService } from "./server_db.js";
import { NewsService } from "./news_service.js";
import { NotificationService, configureVapid } from "./notification_service.js";
import { UserPreferences } from "./src/types.js";
import dotenv from "dotenv";

dotenv.config();
configureVapid();

const app = express();
const PORT = 3000;

app.use(express.json());

// API: Health probe
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// API: Config probe for Supabase public keys & VAPID public key
app.get("/api/config", (req, res) => {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || null;
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || null;
  const vapidKey = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY || null;

  const isValid = Boolean(
    url &&
    key &&
    url.startsWith("http") &&
    !url.includes("your-project") &&
    !url.includes("your-supabase") &&
    !url.includes("example.com") &&
    !key.includes("your-anon-key")
  );

  res.json({
    supabaseUrl: isValid ? url : null,
    supabaseAnonKey: isValid ? key : null,
    vapidPublicKey: vapidKey
  });
});

// API: Subscribe to push notifications
app.post("/api/notifications/subscribe", async (req, res) => {
  try {
    const { endpoint, p256dh, auth_key, user_agent } = req.body;
    const userEmail = (req.headers["x-user-email"] as string) || "default";

    if (!endpoint || !p256dh || !auth_key) {
      return res.status(400).json({ error: "Missing required Web Push subscription keys" });
    }

    await DatabaseService.savePushSubscription(userEmail, {
      endpoint,
      p256dh,
      auth_key,
      user_agent
    });

    // Also enable notifications on user preferences
    const currentPrefs = await DatabaseService.getPreferences(userEmail);
    currentPrefs.notifications_enabled = true;
    await DatabaseService.savePreferences(currentPrefs, userEmail);

    console.info(`[Server] Push subscription registered for user ${userEmail}`);
    res.json({ ok: true });
  } catch (err: any) {
    console.error("Subscription registration error:", err);
    res.status(500).json({ error: err.message || "Failed to register subscription" });
  }
});

// API: Unsubscribe from push notifications
app.post("/api/notifications/unsubscribe", async (req, res) => {
  try {
    const { endpoint } = req.body;
    const userEmail = (req.headers["x-user-email"] as string) || "default";

    if (endpoint) {
      await DatabaseService.deactivatePushSubscription(endpoint);
    }

    const currentPrefs = await DatabaseService.getPreferences(userEmail);
    currentPrefs.notifications_enabled = false;
    await DatabaseService.savePreferences(currentPrefs, userEmail);

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to unsubscribe" });
  }
});

// API: Send manual test notification
app.post("/api/notifications/test", async (req, res) => {
  try {
    const userEmail = (req.headers["x-user-email"] as string) || "default";
    const result = await NotificationService.sendNotificationToUser(userEmail, {
      title: "News Radar — Test Alert",
      body: "Desktop notifications are working perfectly! You'll receive your scheduled briefings here.",
      icon: "/favicon.svg",
      badge: "/favicon-32x32.png",
      data: { url: "/?briefing=latest" }
    });

    res.json({ ok: true, sentCount: result.sentCount, failedCount: result.failedCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Test notification failed" });
  }
});

// API: Vercel Cron Briefing Dispatcher
app.get("/api/cron/briefing-dispatcher", async (req, res) => {
  // Verify authorization if CRON_SECRET is configured
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized cron execution." });
  }

  console.info("[Cron] Running briefing dispatcher cycle...");
  try {
    const dueUsers = await DatabaseService.getUsersDueForBriefing();
    console.info(`[Cron] Found ${dueUsers.length} user(s) due for automated briefing.`);

    const results: any[] = [];

    for (const dueUser of dueUsers) {
      try {
        console.info(`[Cron] Generating scheduled briefing for user ${dueUser.userId}...`);
        const rawArticles = await NewsService.fetchLatestArticles([]);
        const briefing = await NewsService.runRadarIntelligence(rawArticles, dueUser.topics);
        briefing.is_automated = true;

        await DatabaseService.addBriefing(briefing);

        // Send Push Notification
        const cardCount = briefing.cards?.length || 5;
        const readTimeMin = Math.max(1, Math.round((briefing.target_read_time_seconds || 120) / 60));
        const topicSummary = dueUser.topics.slice(0, 2).map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(" · ");

        const pushResult = await NotificationService.sendNotificationToUser(dueUser.userId, {
          title: "Your News Radar briefing is ready",
          body: `${cardCount} important updates · ~${readTimeMin} min read${topicSummary ? ` (${topicSummary})` : ""}`,
          icon: "/favicon.svg",
          badge: "/favicon-32x32.png",
          data: {
            url: `/?briefing_id=${briefing.id}`,
            briefing_id: briefing.id
          }
        });

        results.push({
          userId: dueUser.userId,
          briefingId: briefing.id,
          pushed: pushResult.sentCount > 0
        });
      } catch (userErr: any) {
        console.error(`[Cron] Failed to generate scheduled briefing for user ${dueUser.userId}:`, userErr);
        results.push({
          userId: dueUser.userId,
          error: userErr.message || String(userErr)
        });
      }
    }

    res.json({ ok: true, processedCount: dueUsers.length, results });
  } catch (err: any) {
    console.error("[Cron] Dispatcher execution error:", err);
    res.status(500).json({ error: err.message || "Cron dispatcher failed" });
  }
});

// API: Get briefings
app.get("/api/briefings", async (req, res) => {
  try {
    const briefings = await DBManager.getBriefings();
    res.json(briefings);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to retrieve briefings" });
  }
});

// API: Trigger dynamic briefing generation
app.post("/api/briefings/generate", async (req, res) => {
  try {
    const userEmail = req.headers["x-user-email"] as string | undefined;
    const prefs = await DBManager.getPreferences(userEmail);
    const topics = prefs.topics && prefs.topics.length > 0 ? prefs.topics : ["technology", "startups"];

    // 1. Fetch latest articles from curated source feeds
    const rawArticles = await NewsService.fetchLatestArticles([]);

    // 2. Synthesize briefing using AI
    const briefing = await NewsService.runRadarIntelligence(rawArticles, topics);

    // 3. Save briefing
    await DBManager.addBriefing(briefing);

    console.info(`[Server] Briefing generated successfully: ${briefing.id}`);

    res.json(briefing);
  } catch (err: any) {
    console.error("Briefing generation error:", err);
    res.status(500).json({ error: err.message || "Briefing generation failed." });
  }
});

// API: Story state (get read items & mark read/unread)
app.get("/api/story_state", async (req, res) => {
  try {
    const userEmail = req.headers["x-user-email"] as string | undefined;
    const readIds = await DBManager.getReadStoryIds(userEmail);
    res.json(readIds);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to get story state" });
  }
});

app.post("/api/story_state", async (req, res) => {
  try {
    const { card_id, is_read } = req.body;
    const userEmail = req.headers["x-user-email"] as string | undefined;
    await DBManager.updateStoryState(card_id, Boolean(is_read), userEmail);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update story state" });
  }
});

// API: User preferences
app.get("/api/preferences", async (req, res) => {
  try {
    const userEmail = req.headers["x-user-email"] as string | undefined;
    const prefs = await DBManager.getPreferences(userEmail);
    res.json(prefs);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to get user preferences" });
  }
});

app.put("/api/preferences", async (req, res) => {
  try {
    const { topics, briefing_frequency_hours } = req.body;
    const userEmail = req.headers["x-user-email"] as string | undefined;

    const validTopics = Array.isArray(topics) ? topics : ["technology", "startups"];
    const validFreq = [3, 6, 12, 24].includes(Number(briefing_frequency_hours)) ? Number(briefing_frequency_hours) as any : 6;

    const updatedPrefs: UserPreferences = {
      topics: validTopics,
      briefing_frequency_hours: validFreq
    };

    await DBManager.savePreferences(updatedPrefs, userEmail);
    console.info("[Server] User preferences updated successfully.");

    res.json({ ok: true, preferences: updatedPrefs });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save user preferences" });
  }
});

// Integrated Dev and Production Serve flows
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Vite middleware for development HMR-less hot rebuild triggers
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite developmental asset middleware attached.");
  } else {
    // Connect compiled static targets in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log(`Production static assets connected at: ${distPath}`);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[News Radar] Backend service online. Access Dev Preview on PORT ${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
