/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { DBManager } from "./server_db";
import { NewsService } from "./news_service";
import { UserPreferences, Feedback } from "./src/types";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API: Health probe
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// API: Config probe for Supabase public keys
app.get("/api/config", (req, res) => {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || null;
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || null;

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
    supabaseAnonKey: isValid ? key : null
  });
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

    // 4. Log analytics event
    await DBManager.addAnalyticsEvent("briefing_generated", {
      briefing_id: briefing.id,
      card_count: briefing.cards.length,
      topics
    });

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
    const { topics, briefing_frequency_hours, notifications_enabled } = req.body;
    const userEmail = req.headers["x-user-email"] as string | undefined;

    const validTopics = Array.isArray(topics) ? topics : ["technology", "startups"];
    const validFreq = [3, 6, 12, 24].includes(Number(briefing_frequency_hours)) ? Number(briefing_frequency_hours) as any : 6;

    const updatedPrefs: UserPreferences = {
      topics: validTopics,
      briefing_frequency_hours: validFreq,
      notifications_enabled: Boolean(notifications_enabled)
    };

    await DBManager.savePreferences(updatedPrefs, userEmail);
    await DBManager.addAnalyticsEvent("preferences_updated", updatedPrefs);
    DBManager.addLiveLog("User preferences updated.", "success");

    res.json({ ok: true, preferences: updatedPrefs });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save user preferences" });
  }
});

// API: Feedback collector
app.get("/api/feedback", async (req, res) => {
  try {
    const feedbacks = await DBManager.getFeedbacks();
    res.json(feedbacks);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load feedback listings" });
  }
});

app.post("/api/feedback", async (req, res) => {
  try {
    const { card_id, feedback_type, comment } = req.body;
    
    if (!card_id || !feedback_type) {
      return res.status(400).json({ error: "Card ID and Feedback Type required" });
    }

    const feedback: Feedback = {
      id: "fdb-" + Math.random().toString(36).substr(2, 9),
      briefing_item_id: card_id,
      feedback_type: feedback_type === "useful" || feedback_type === "not_relevant" ? feedback_type : "useful",
      created_at: new Date().toISOString()
    };

    await DBManager.addFeedback(feedback);
    await DBManager.addAnalyticsEvent("feedback_submitted", { card_id, feedback_type, has_comment: !!comment });
    DBManager.addLiveLog(`User submitted feedback response [${feedback_type.toUpperCase()}] for card ${card_id}.`, "info");

    res.json({ ok: true, feedback });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to record feedback response" });
  }
});

// API: Get background logs
app.get("/api/logs", async (req, res) => {
  res.json(await DBManager.getLiveLogs());
});

app.post("/api/logs/clear", async (req, res) => {
  await DBManager.clearLiveLogs();
  res.json({ ok: true });
});

// API: Capture custom analytics event (e.g. from the client clicks for audit tracer)
app.get("/api/analytics", async (req, res) => {
  res.json(await DBManager.getAnalyticsEvents());
});

app.post("/api/analytics", async (req, res) => {
  try {
    const { event_name, metadata } = req.body;
    if (!event_name) {
      return res.status(400).json({ error: "event_name is required" });
    }
    await DBManager.addAnalyticsEvent(event_name, metadata || {});
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to register analytics trace" });
  }
});

// Integrated Dev and Production Serve flows
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Vite middleware for development HMR-less hot rebuild triggers
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
