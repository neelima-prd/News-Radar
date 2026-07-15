/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Briefing, UserPreferences, Feedback, AnalyticsEvent, LiveRadarLog } from "./src/types";

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key || url.includes("your-project") || key.includes("your-anon-key") || url === "MY_SUPABASE_URL" || key === "MY_SUPABASE_ANON_KEY") {
    return null;
  }

  try {
    supabaseClient = createClient(url, key, {
      auth: {
        persistSession: false
      }
    });
    return supabaseClient;
  } catch (err) {
    console.warn("Failed to initialize Supabase client:", err);
    return null;
  }
}


const DB_FILE = process.env.VERCEL
  ? "/tmp/db.json"
  : path.join(process.cwd(), "db.json");

interface DBStructure {
  briefings: Briefing[];
  preferences: UserPreferences;
  feedbacks: Feedback[];
  analytics_events: AnalyticsEvent[];
  live_logs: LiveRadarLog[];
}

const DEFAULT_PREFS: UserPreferences = {
  categories: ["AI & ML", "Startups & VC", "Biotech", "Fintech", "Green Tech"],
  frequency: "daily",
  custom_feeds: [
    "https://techcrunch.com/feed/",
    "https://news.ycombinator.com/rss",
    "https://search.cnbc.com/rs/search/combinedfeed.xml?show=1"
  ]
};

// Seed initial briefings to populate the UI beautifully if empty
const seedBriefings = (): Briefing[] => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const prevDay = new Date();
  prevDay.setDate(prevDay.getDate() - 2);

  return [
    {
      id: "briefing-yesterday",
      generated_at: yesterday.toISOString(),
      is_automated: true,
      cards: [
        {
          id: "card-y1",
          briefing_id: "briefing-yesterday",
          headline: "OpenAI Announces Advanced Audio Mode and Voice Customization APIs",
          summary: "OpenAI has rolled out a suite of dynamic audio capabilities enabling real-time conversational latencies under 300ms. These tools give developers the ability to build natural multi-turn verbal interactions with custom voice presets and pitch modulation control.",
          why_it_matters: "This marks a massive transition from structured text prompting to zero-latency natural audio dialogues. It speeds up the adoption of conversational AI agents across customer service, virtual companions, and interactive accessibility software.",
          category: "AI & ML",
          relevance: 95,
          importance: 90,
          popularity: 88,
          score: Math.round(95 * 0.4 + 90 * 0.4 + 88 * 0.2),
          source_articles: [
            { title: "OpenAI releases Realtime API for multi-modal audio applications", url: "https://techcrunch.com", source: "TechCrunch" },
            { title: "Show HN: Building voice bots with OpenAI's new audio endpoint", url: "https://news.ycombinator.com", source: "Hacker News" }
          ]
        },
        {
          id: "card-y2",
          briefing_id: "briefing-yesterday",
          headline: "Venture Inflow into Green Tech Surges as Fusion Prototypes Advance",
          summary: "New seed funding rounds for inertial confinement fusion and commercial hydrogen refueling grids hit a record $2.4B this quarter. Key startups including Helion and H2Drive reported breakthroughs in containment field stability and cell efficiency.",
          why_it_matters: "Private capital is shifting heavily towards ultra-deep tech infrastructure, driven by rising data center energy needs. Heavy tech giants are committing future power-purchase agreements, signaling pre-market commercialization of fusion energy.",
          category: "Green Tech",
          relevance: 88,
          importance: 86,
          popularity: 75,
          score: Math.round(88 * 0.4 + 86 * 0.4 + 75 * 0.2),
          source_articles: [
            { title: "Green Energy funding breaks quarterly records as AI demands power", url: "https://venturebeat.com", source: "VentureBeat" }
          ]
        },
        {
          id: "card-y3",
          briefing_id: "briefing-yesterday",
          headline: "Y Combinator Introduces AI-Driven Auto-Matching for Co-Founders",
          summary: "The flagship startup accelerator rolled out an automated directory pairing co-founders using graph embeddings and complementary skill vectors. The system evaluates previous work telemetry, personality index, and equity preferences to map optimal pairings.",
          why_it_matters: "Finding compatible co-founders remains the single largest point of failure for pre-seed startups. Automating raw match-making reduces friction and broadens the pipeline for solo technical founders trying to build structural businesses.",
          category: "Startups & VC",
          relevance: 85,
          importance: 82,
          popularity: 80,
          score: Math.round(85 * 0.4 + 82 * 0.4 + 80 * 0.2),
          source_articles: [
            { title: "YC Launches new directory tool to pairing founders by skill embeddings", url: "https://techcrunch.com", source: "TechCrunch" }
          ]
        }
      ]
    },
    {
      id: "briefing-prev",
      generated_at: prevDay.toISOString(),
      is_automated: true,
      cards: [
        {
          id: "card-p1",
          briefing_id: "briefing-prev",
          headline: "NVIDIA Quantum Simulation Suite Enters Public Beta",
          summary: "NVIDIA unveiled its flagship developer toolkit allowing standard CUDA GPU architectures to emulate up to 40 qubits of noise-resistant quantum circuits, accelerating chemical computation and cryptographic hardening trials.",
          why_it_matters: "This democratizes early quantum research by letting teams run heavy simulation workloads using existing cloud GPU clusters instead of waiting for physical cryo-cooled quantum rigs.",
          category: "AI & ML",
          relevance: 92,
          importance: 89,
          popularity: 82,
          score: Math.round(92 * 0.4 + 89 * 0.4 + 82 * 0.2),
          source_articles: [
            { title: "NVIDIA launches public beta of quantum SDK on Hopper architecture", url: "https://venturebeat.com", source: "VentureBeat" }
          ]
        }
      ]
    }
  ];
};

const seedAnalytics = (): AnalyticsEvent[] => {
  return [
    {
      id: "ae1",
      event_name: "app_initialized",
      metadata: { user_agent: "Node/Express Server", system_time: new Date().toISOString() },
      created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
    },
    {
      id: "ae2",
      event_name: "briefing_viewed",
      metadata: { briefing_id: "briefing-yesterday" },
      created_at: new Date(Date.now() - 3600000 * 12).toISOString()
    }
  ];
};

export class DBManager {
  private static loadDB(): DBStructure {
    try {
      if (process.env.VERCEL && !fs.existsSync("/tmp/db.json")) {
        const templatePath = path.join(process.cwd(), "db.json");
        if (fs.existsSync(templatePath)) {
          fs.copyFileSync(templatePath, "/tmp/db.json");
        }
      }
      if (!fs.existsSync(DB_FILE)) {
        const initialDB: DBStructure = {
          briefings: seedBriefings(),
          preferences: DEFAULT_PREFS,
          feedbacks: [
            {
              id: "f1",
              card_id: "card-y1",
              feedback_type: "up",
              comment: "Excellent summary of the voice latency improvements. Exactly what I needed.",
              created_at: new Date(Date.now() - 3600000 * 10).toISOString()
            }
          ],
          analytics_events: seedAnalytics(),
          live_logs: [
            {
              timestamp: new Date().toISOString(),
              message: "Database system initialized. Seed briefings loaded successfully.",
              type: "success"
            }
          ]
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2), "utf-8");
        return initialDB;
      }
      return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    } catch (e) {
      console.error("Failed to load local DB, fallback to memory", e);
      return {
        briefings: seedBriefings(),
        preferences: DEFAULT_PREFS,
        feedbacks: [],
        analytics_events: [],
        live_logs: []
      };
    }
  }

  private static saveDB(db: DBStructure) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to write to local DB file", e);
    }
  }

  static async getBriefings(): Promise<Briefing[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("briefings")
          .select("*")
          .order("generated_at", { ascending: false });

        if (error) {
          console.warn("Supabase getBriefings warning, falling back to local file DB:", error.message);
        } else if (data && data.length > 0) {
          return data.map((b: any) => ({
            id: b.id,
            generated_at: b.generated_at,
            is_automated: b.is_automated,
            cards: typeof b.cards === "string" ? JSON.parse(b.cards) : b.cards,
            scanned_count: b.scanned_count,
            target_read_time_seconds: b.target_read_time_seconds
          }));
        }
      } catch (err: any) {
        console.warn("Supabase getBriefings exception, falling back:", err.message || err);
      }
    }

    const db = this.loadDB();
    return db.briefings.sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime());
  }

  static async addBriefing(briefing: Briefing): Promise<void> {
    const db = this.loadDB();
    db.briefings.push(briefing);
    this.saveDB(db);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase
          .from("briefings")
          .insert([{
            id: briefing.id,
            generated_at: briefing.generated_at,
            is_automated: briefing.is_automated,
            cards: briefing.cards, // Supabase jsonb auto-handles arrays/objects
            scanned_count: briefing.scanned_count || 0,
            target_read_time_seconds: briefing.target_read_time_seconds || 0
          }]);

        if (error) {
          console.warn("Supabase addBriefing warning:", error.message);
        }
      } catch (err: any) {
        console.warn("Supabase addBriefing exception:", err.message || err);
      }
    }
  }

  static async getPreferences(userEmail?: string): Promise<UserPreferences> {
    const supabase = getSupabaseClient();
    const userId = userEmail || "default";
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("preferences")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        if (error) {
          console.warn("Supabase getPreferences warning, falling back:", error.message);
        } else if (data) {
          return {
            categories: typeof data.categories === "string" ? JSON.parse(data.categories) : (data.categories || []),
            frequency: data.frequency || "daily",
            custom_feeds: typeof data.custom_feeds === "string" ? JSON.parse(data.custom_feeds) : (data.custom_feeds || [])
          };
        }
      } catch (err: any) {
        console.warn("Supabase getPreferences exception, falling back:", err.message || err);
      }
    }

    const db = this.loadDB();
    return db.preferences || DEFAULT_PREFS;
  }

  static async savePreferences(preferences: UserPreferences, userEmail?: string): Promise<void> {
    const db = this.loadDB();
    db.preferences = preferences;
    this.saveDB(db);

    const supabase = getSupabaseClient();
    const userId = userEmail || "default";
    if (supabase) {
      try {
        const { error } = await supabase
          .from("preferences")
          .upsert({
            id: userId,
            categories: preferences.categories,
            frequency: preferences.frequency,
            custom_feeds: preferences.custom_feeds,
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.warn("Supabase savePreferences warning:", error.message);
        }
      } catch (err: any) {
        console.warn("Supabase savePreferences exception:", err.message || err);
      }
    }
  }

  static async getFeedbacks(): Promise<Feedback[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("feedback")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.warn("Supabase getFeedbacks warning, falling back:", error.message);
        } else if (data) {
          return data;
        }
      } catch (err: any) {
        console.warn("Supabase getFeedbacks exception, falling back:", err.message || err);
      }
    }

    const db = this.loadDB();
    return db.feedbacks;
  }

  static async addFeedback(feedback: Feedback): Promise<void> {
    const db = this.loadDB();
    db.feedbacks.push(feedback);
    this.saveDB(db);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase
          .from("feedback")
          .insert([{
            id: feedback.id,
            card_id: feedback.card_id,
            feedback_type: feedback.feedback_type,
            comment: feedback.comment || "",
            created_at: feedback.created_at
          }]);

        if (error) {
          console.warn("Supabase addFeedback warning:", error.message);
        }
      } catch (err: any) {
        console.warn("Supabase addFeedback exception:", err.message || err);
      }
    }
  }

  static async getAnalyticsEvents(): Promise<AnalyticsEvent[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("analytics_events")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.warn("Supabase getAnalyticsEvents warning, falling back:", error.message);
        } else if (data) {
          return data.map((d: any) => ({
            id: d.id,
            event_name: d.event_name,
            metadata: typeof d.metadata === "string" ? JSON.parse(d.metadata) : d.metadata,
            created_at: d.created_at
          }));
        }
      } catch (err: any) {
        console.warn("Supabase getAnalyticsEvents exception, falling back:", err.message || err);
      }
    }

    const db = this.loadDB();
    return db.analytics_events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  static async addAnalyticsEvent(event_name: string, metadata: Record<string, any>): Promise<void> {
    const id = "evt-" + Math.random().toString(36).substr(2, 9);
    const created_at = new Date().toISOString();

    const db = this.loadDB();
    const newEvent: AnalyticsEvent = {
      id,
      event_name,
      metadata,
      created_at
    };
    db.analytics_events.push(newEvent);
    this.saveDB(db);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase
          .from("analytics_events")
          .insert([{
            id,
            event_name,
            metadata,
            created_at
          }]);

        if (error) {
          console.warn("Supabase addAnalyticsEvent warning:", error.message);
        }
      } catch (err: any) {
        console.warn("Supabase addAnalyticsEvent exception:", err.message || err);
      }
    }
  }

  static async getLiveLogs(): Promise<LiveRadarLog[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("live_logs")
          .select("*")
          .order("timestamp", { ascending: false })
          .limit(50);

        if (error) {
          console.warn("Supabase getLiveLogs warning, falling back:", error.message);
        } else if (data) {
          return data.map((d: any) => ({
            timestamp: d.timestamp,
            message: d.message,
            type: d.type
          }));
        }
      } catch (err: any) {
        console.warn("Supabase getLiveLogs exception, falling back:", err.message || err);
      }
    }

    const db = this.loadDB();
    return db.live_logs.slice(-50); // Keep last 50 logs
  }

  static addLiveLog(message: string, type: "info" | "success" | "warning" | "error" = "info") {
    // 1. Local logging
    const db = this.loadDB();
    db.live_logs.push({
      timestamp: new Date().toISOString(),
      message,
      type
    });
    this.saveDB(db);

    // 2. Supabase logging (background promise, completely non-blocking for callers)
    const supabase = getSupabaseClient();
    if (supabase) {
      (async () => {
        try {
          const { error } = await supabase
            .from("live_logs")
            .insert([{
              timestamp: new Date().toISOString(),
              message,
              type
            }]);
          if (error) {
            console.warn("Supabase addLiveLog background warning:", error.message);
          }
        } catch (err: any) {
          console.warn("Supabase addLiveLog background exception:", err.message || err);
        }
      })();
    }
  }

  static async clearLiveLogs(): Promise<void> {
    const db = this.loadDB();
    db.live_logs = [
      {
        timestamp: new Date().toISOString(),
        message: "Radar logs flushed. Ready to scan.",
        type: "info"
      }
    ];
    this.saveDB(db);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase
          .from("live_logs")
          .delete()
          .neq("timestamp", "1970-01-01T00:00:00Z"); // Safe way to clear table without triggers blocking

        if (error) {
          console.warn("Supabase clearLiveLogs warning:", error.message);
        }

        await supabase
          .from("live_logs")
          .insert([{
            timestamp: new Date().toISOString(),
            message: "Radar logs flushed. Ready to scan.",
            type: "info"
          }]);
      } catch (err: any) {
        console.warn("Supabase clearLiveLogs exception:", err.message || err);
      }
    }
  }
}
