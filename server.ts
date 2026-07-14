/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { DBManager } from "./server_db";
import { NewsService } from "./news_service";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API: Health probe
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
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

// API: Trigger dynamic Radar Sweeper briefing generation
app.post("/api/briefings/generate", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
      DBManager.addLiveLog("Attempted Radar Sweep, but GEMINI_API_KEY is not defined. Please add your key in Settings > Secrets.", "error");
      return res.status(400).json({
        error: "GEMINI_API_KEY environment variable is not defined or is a placeholder.",
        isKeyError: true
      });
    }

    const { categories, custom_feeds } = await DBManager.getPreferences();
    
    // 1. Fetch articles
    const rawArticles = await NewsService.fetchLatestArticles(custom_feeds);
    
    // 2. Synthesize using Gemini
    const briefing = await NewsService.runRadarIntelligence(rawArticles, categories);
    
    // 3. Save briefing
    await DBManager.addBriefing(briefing);
    
    // 4. Log analytics event
    await DBManager.addAnalyticsEvent("radar_sweep_triggered", {
      briefing_id: briefing.id,
      card_count: briefing.cards.length,
      category_filters: categories
    });

    res.json(briefing);
  } catch (err: any) {
    console.error("Radar Sweep error:", err);
    res.status(500).json({ error: err.message || "Radar sweep failed due to systemic error" });
  }
});

// API: User preferences
app.get("/api/preferences", async (req, res) => {
  try {
    const prefs = await DBManager.getPreferences();
    res.json(prefs);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to get user preferences" });
  }
});

app.put("/api/preferences", async (req, res) => {
  try {
    const { categories, frequency, custom_feeds } = req.body;
    
    if (!Array.isArray(categories) || !frequency) {
      return res.status(400).json({ error: "Invalid preference schema" });
    }

    await DBManager.savePreferences({ categories, frequency, custom_feeds: custom_feeds || [] });
    await DBManager.addAnalyticsEvent("preferences_updated", { categories, frequency, feed_count: (custom_feeds || []).length });
    DBManager.addLiveLog("User preferences and custom feed configurations updated.", "success");

    res.json({ ok: true, preferences: await DBManager.getPreferences() });
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

    const feedback = {
      id: "fdb-" + Math.random().toString(36).substr(2, 9),
      card_id,
      feedback_type,
      comment,
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
