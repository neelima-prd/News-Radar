/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { DBManager } from "./server_db.js";
import { NewsService } from "./news_service.js";
import { UserPreferences } from "./src/types.js";
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
