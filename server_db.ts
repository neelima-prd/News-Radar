/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Briefing, BriefingCard, UserPreferences, Feedback, AnalyticsEvent, LiveRadarLog } from "./src/types.js";

let supabaseClient: SupabaseClient | null = null;
let supabaseDisabled = false;
let lastSupabaseCheckTime = 0;

function getSupabaseClient(): SupabaseClient | null {
  if (supabaseDisabled) {
    if (Date.now() - lastSupabaseCheckTime < 60000) {
      return null;
    }
    supabaseDisabled = false;
  }

  if (supabaseClient) return supabaseClient;

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

  if (
    !url ||
    !key ||
    !url.startsWith("http") ||
    url.includes("your-project") ||
    url.includes("your-supabase") ||
    url.includes("example.com") ||
    key.includes("your-anon-key") ||
    url === "MY_SUPABASE_URL" ||
    key === "MY_SUPABASE_ANON_KEY"
  ) {
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

function handleSupabaseError(context: string, err: any) {
  const msg = typeof err === "string" ? err : err?.message || String(err);
  if (
    msg.includes("fetch failed") ||
    msg.includes("Failed to fetch") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("TypeError")
  ) {
    supabaseDisabled = true;
    supabaseClient = null;
    lastSupabaseCheckTime = Date.now();
    console.info(`[Database] Supabase endpoint unreachable (${context}), falling back to local database store.`);
  } else {
    console.warn(`[Database] Supabase ${context} warning: ${msg}`);
  }
}

function isValidUUID(str?: string): boolean {
  if (!str) return false;
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);
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
  user_story_states?: Record<string, string[]>;
}

const DEFAULT_PREFS: UserPreferences = {
  topics: ["technology", "startups"],
  briefing_frequency_hours: 6
};

function safeParseArray(val: any): string[] {
  if (Array.isArray(val)) {
    return val;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
      } catch (_) {}
    }
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      // Postgres text array format: {"item1","item2"} or {item1,item2}
      return trimmed
        .slice(1, -1)
        .split(",")
        .map(item => item.trim().replace(/^"|"$/g, "").replace(/\\"/g, '"'))
        .filter(Boolean);
    }
    // Comma-separated fallback
    return trimmed.split(",").map(item => item.trim()).filter(Boolean);
  }
  return [];
}

const SEED_BRIEFING_ID = "11111111-1111-4111-8111-111111111111";
const SEED_CARD_IDS = [
  "22222222-2222-4222-8222-222222222201",
  "22222222-2222-4222-8222-222222222202",
  "22222222-2222-4222-8222-222222222203",
  "22222222-2222-4222-8222-222222222204",
  "22222222-2222-4222-8222-222222222205"
];

// Seed initial briefings to populate the UI beautifully if empty
const seedBriefings = (): Briefing[] => {
  const now = new Date();

  return [
    {
      id: SEED_BRIEFING_ID,
      generated_at: now.toISOString(),
      is_automated: true,
      scanned_count: 127,
      cluster_count: 42,
      selected_story_count: 5,
      target_read_time_seconds: 58,
      cards: [
        {
          id: SEED_CARD_IDS[0],
          briefing_id: SEED_BRIEFING_ID,
          rank: 1,
          priority: "TOP STORY",
          headline: "OpenAI Announces Advanced Realtime Voice and Multi-Modal Agent APIs",
          summary: "OpenAI has rolled out a suite of dynamic audio capabilities enabling real-time conversational latencies under 300ms. These tools give developers the ability to build natural multi-turn verbal interactions with custom voice presets.",
          why_it_matters: "This marks a massive transition from structured text prompting to zero-latency natural audio dialogues. It accelerates the adoption of conversational AI agents across customer service and interactive software.",
          category: "Technology",
          why_selected: [
            "Matches your Technology interest",
            "High industry impact across developer tools",
            "Covered by 4 trusted tech publications"
          ],
          source_articles: [
            { title: "OpenAI releases Realtime API for multi-modal audio applications", url: "https://techcrunch.com", source: "TechCrunch" },
            { title: "Show HN: Building voice bots with OpenAI's new audio endpoint", url: "https://news.ycombinator.com", source: "Hacker News" }
          ],
          isRead: false
        },
        {
          id: SEED_CARD_IDS[1],
          briefing_id: SEED_BRIEFING_ID,
          rank: 2,
          priority: "IMPORTANT",
          headline: "Y Combinator Introduces AI-Driven Auto-Matching for Co-Founders",
          summary: "The flagship startup accelerator rolled out an automated directory pairing co-founders using graph embeddings and complementary skill vectors. The system evaluates previous work experience, skills, and startup preferences.",
          why_it_matters: "Finding compatible co-founders remains the single largest point of failure for early-stage startups. Automating founder match-making reduces friction and broadens the pipeline for solo technical founders.",
          category: "Startups",
          why_selected: [
            "Matches your Startups interest",
            "Significant update for early-stage founders",
            "Covered by YC and TechCrunch"
          ],
          source_articles: [
            { title: "YC Launches new directory tool to pair founders by skill embeddings", url: "https://techcrunch.com", source: "TechCrunch" }
          ],
          isRead: false
        },
        {
          id: SEED_CARD_IDS[2],
          briefing_id: SEED_BRIEFING_ID,
          rank: 3,
          priority: "IMPORTANT",
          headline: "Anthropic Releases Claude 3.5 Sonnet Artifacts for Team Collaboration",
          summary: "Anthropic has expanded Artifacts to organization workspaces, enabling engineers and designers to co-edit code snippets, UI wireframes, and vector diagrams in real-time inside the AI chat interface.",
          why_it_matters: "Transforms AI from an isolated chat box into a shared interactive canvas, directly embedding generative models into daily engineering and design workflows.",
          category: "Technology",
          why_selected: [
            "Matches your Technology interest",
            "High adoption among startup teams",
            "Covered by VentureBeat and TechCrunch"
          ],
          source_articles: [
            { title: "Anthropic brings interactive Artifacts canvas to enterprise teams", url: "https://venturebeat.com", source: "VentureBeat" }
          ],
          isRead: false
        },
        {
          id: SEED_CARD_IDS[3],
          briefing_id: SEED_BRIEFING_ID,
          rank: 4,
          priority: "OTHER",
          headline: "TSMC Breaks Ground on Sub-2nm Semiconductor Fab in Saxony",
          summary: "TSMC has officially started foundations for its modern semiconductor foundry in Germany, targeting production of sub-2nm chip channels by late 2027 to stabilize European chip supply grids.",
          why_it_matters: "Secures sovereign semiconductor fabrication capacity for autonomous vehicle processors, edge robotics, and localized AI compute hardware.",
          category: "Technology",
          why_selected: [
            "Matches your Technology interest",
            "Critical hardware supply chain milestone",
            "Covered by major financial & tech outlets"
          ],
          source_articles: [
            { title: "TSMC breaks ground on sub-2nm fab in Europe", url: "https://news.ycombinator.com", source: "Hacker News" }
          ],
          isRead: false
        },
        {
          id: SEED_CARD_IDS[4],
          briefing_id: SEED_BRIEFING_ID,
          rank: 5,
          priority: "OTHER",
          headline: "Early-Stage AI Compiler Startup Raises $12M Pre-Seed Round",
          summary: "A stealth-mode startup from the latest Y Combinator batch announced a $12M round to build open-source compilers that translate PyTorch neural weights directly onto microchip gate arrays.",
          why_it_matters: "Drops compute latencies in handheld edge devices by up to 80x compared to cloud server inferencing, lowering operational costs for robotics startups.",
          category: "Startups",
          why_selected: [
            "Matches your Startups interest",
            "Venture funding trend in hardware compilers",
            "Covered by TechCrunch and Hacker News"
          ],
          source_articles: [
            { title: "YC edge compiler startup raises $12M pre-seed", url: "https://techcrunch.com", source: "TechCrunch" }
          ],
          isRead: false
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
      metadata: { briefing_id: SEED_BRIEFING_ID },
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
              id: "33333333-3333-4333-8333-333333333333",
              briefing_item_id: SEED_CARD_IDS[0],
              feedback_type: "useful",
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
          .select("*, briefing_items(*)")
          .order("generated_at", { ascending: false });

        if (error) {
          handleSupabaseError("getBriefings", error);
        } else if (data && data.length > 0) {
          return data.map((b: any) => {
            const items = Array.isArray(b.briefing_items) ? b.briefing_items : [];
            items.sort((a: any, b: any) => (a.rank || 0) - (b.rank || 0));

            const cards: BriefingCard[] = items.map((item: any) => ({
              id: item.id,
              briefing_id: item.briefing_id,
              rank: item.rank,
              priority: item.priority || "IMPORTANT",
              headline: item.headline,
              summary: item.summary,
              why_it_matters: item.why_it_matters,
              category: item.category,
              why_selected: safeParseArray(item.why_selected),
              source_articles: safeParseArray(item.source_articles || []),
              isRead: false
            }));

            return {
              id: b.id,
              generated_at: b.generated_at,
              is_automated: false,
              cards: cards.length > 0 ? cards : (b.cards ? (typeof b.cards === "string" ? JSON.parse(b.cards) : b.cards) : []),
              scanned_count: b.article_count_analyzed || b.scanned_count || 0,
              target_read_time_seconds: b.estimated_read_seconds || b.target_read_time_seconds || 0,
              selected_story_count: b.selected_story_count || cards.length
            };
          });
        }
      } catch (err: any) {
        handleSupabaseError("getBriefings", err);
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
        const briefingId = isValidUUID(briefing.id) ? briefing.id : randomUUID();

        // 1. Insert briefing header row
        const { error: bError } = await supabase
          .from("briefings")
          .insert([{
            id: briefingId,
            generated_at: briefing.generated_at,
            status: "ready",
            article_count_analyzed: briefing.scanned_count || 0,
            estimated_read_seconds: briefing.target_read_time_seconds || 0,
            selected_story_count: briefing.cards?.length || 0
          }]);

        if (bError) {
          handleSupabaseError("addBriefing header", bError);
        }

        // 2. Insert briefing items
        if (briefing.cards && briefing.cards.length > 0) {
          const itemsToInsert = briefing.cards.map((card, idx) => ({
            id: isValidUUID(card.id) ? card.id : randomUUID(),
            briefing_id: briefingId,
            rank: card.rank || (idx + 1),
            priority: card.priority || "IMPORTANT",
            category: card.category || "Technology",
            headline: card.headline,
            summary: card.summary,
            why_it_matters: card.why_it_matters,
            why_selected: card.why_selected || []
          }));

          const { error: biError } = await supabase
            .from("briefing_items")
            .insert(itemsToInsert);

          if (biError) {
            handleSupabaseError("addBriefing items", biError);
          }
        }
      } catch (err: any) {
        handleSupabaseError("addBriefing", err);
      }
    }
  }

  static async getPreferences(userEmail?: string): Promise<UserPreferences> {
    const supabase = getSupabaseClient();
    const userId = isValidUUID(userEmail) ? userEmail : null;
    if (supabase && userId) {
      try {
        const { data, error } = await supabase
          .from("user_preferences")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (error) {
          handleSupabaseError("getPreferences", error);
        } else if (data) {
          return {
            topics: safeParseArray(data.topics || ["technology", "startups"]),
            briefing_frequency_hours: (Number(data.briefing_frequency_hours) || 6) as any,
            notifications_enabled: data.notifications_enabled ?? true
          };
        }
      } catch (err: any) {
        handleSupabaseError("getPreferences", err);
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
    const userId = isValidUUID(userEmail) ? userEmail : null;
    if (supabase && userId) {
      try {
        const { error } = await supabase
          .from("user_preferences")
          .upsert({
            user_id: userId,
            briefing_frequency_hours: preferences.briefing_frequency_hours,
            notifications_enabled: preferences.notifications_enabled,
            updated_at: new Date().toISOString()
          });

        if (error) {
          handleSupabaseError("savePreferences", error);
        }
      } catch (err: any) {
        handleSupabaseError("savePreferences", err);
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
          handleSupabaseError("getFeedbacks", error);
        } else if (data) {
          return data;
        }
      } catch (err: any) {
        handleSupabaseError("getFeedbacks", err);
      }
    }

    const db = this.loadDB();
    return db.feedbacks;
  }

  static async addFeedback(feedback: Feedback, userEmail?: string): Promise<void> {
    const db = this.loadDB();
    db.feedbacks.push(feedback);
    this.saveDB(db);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const userId = isValidUUID(userEmail) ? userEmail : null;
        const feedbackId = isValidUUID(feedback.id) ? feedback.id : randomUUID();

        if (isValidUUID(feedback.briefing_item_id)) {
          const insertPayload: any = {
            id: feedbackId,
            briefing_item_id: feedback.briefing_item_id,
            feedback_type: feedback.feedback_type === "useful" || feedback.feedback_type === "not_relevant" ? feedback.feedback_type : "useful",
            created_at: feedback.created_at || new Date().toISOString()
          };
          if (userId) {
            insertPayload.user_id = userId;
          }

          const { error } = await supabase
            .from("feedback")
            .insert([insertPayload]);

          if (error) {
            handleSupabaseError("addFeedback", error);
          }
        }
      } catch (err: any) {
        handleSupabaseError("addFeedback", err);
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
          handleSupabaseError("getAnalyticsEvents", error);
        } else if (data) {
          return data.map((d: any) => ({
            id: d.id,
            event_name: d.event_name,
            metadata: typeof d.metadata === "string" ? JSON.parse(d.metadata) : d.metadata,
            created_at: d.created_at
          }));
        }
      } catch (err: any) {
        handleSupabaseError("getAnalyticsEvents", err);
      }
    }

    const db = this.loadDB();
    return db.analytics_events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  static async addAnalyticsEvent(event_name: string, metadata: Record<string, any>, userEmail?: string): Promise<void> {
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
        const userId = isValidUUID(userEmail) ? userEmail : null;
        const insertPayload: any = {
          id,
          event_name,
          metadata,
          created_at
        };
        if (userId) {
          insertPayload.user_id = userId;
        }

        const { error } = await supabase
          .from("analytics_events")
          .insert([insertPayload]);

        if (error) {
          handleSupabaseError("addAnalyticsEvent", error);
        }
      } catch (err: any) {
        handleSupabaseError("addAnalyticsEvent", err);
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
          handleSupabaseError("getLiveLogs", error);
        } else if (data) {
          return data.map((d: any) => ({
            timestamp: d.timestamp,
            message: d.message,
            type: d.type
          }));
        }
      } catch (err: any) {
        handleSupabaseError("getLiveLogs", err);
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
            handleSupabaseError("addLiveLog background", error);
          }
        } catch (err: any) {
          handleSupabaseError("addLiveLog background", err);
        }
      })();
    }
  }

  static async getReadStoryIds(userId?: string): Promise<string[]> {
    const supabase = getSupabaseClient();
    const validUserId = isValidUUID(userId) ? userId : null;
    if (supabase && validUserId) {
      try {
        const { data, error } = await supabase
          .from("user_story_state")
          .select("briefing_item_id, status")
          .eq("user_id", validUserId)
          .eq("status", "read");

        if (error) {
          handleSupabaseError("getReadStoryIds", error);
        } else if (data) {
          return data.map((d: any) => d.briefing_item_id);
        }
      } catch (err: any) {
        handleSupabaseError("getReadStoryIds", err);
      }
    }

    const db = this.loadDB();
    const uid = userId || "default";
    return db.user_story_states?.[uid] || [];
  }

  static async updateStoryState(cardId: string, isRead: boolean, userId?: string): Promise<void> {
    const uid = userId || "default";
    const db = this.loadDB();
    if (!db.user_story_states) db.user_story_states = {};
    if (!db.user_story_states[uid]) db.user_story_states[uid] = [];

    if (isRead) {
      if (!db.user_story_states[uid].includes(cardId)) {
        db.user_story_states[uid].push(cardId);
      }
    } else {
      db.user_story_states[uid] = db.user_story_states[uid].filter(id => id !== cardId);
    }
    this.saveDB(db);

    const supabase = getSupabaseClient();
    const validUserId = isValidUUID(userId) ? userId : null;
    if (supabase && validUserId && isValidUUID(cardId)) {
      try {
        const { error } = await supabase
          .from("user_story_state")
          .upsert({
            user_id: validUserId,
            briefing_item_id: cardId,
            status: isRead ? "read" : "unread",
            read_at: isRead ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          });

        if (error) {
          handleSupabaseError("updateStoryState", error);
        }
      } catch (err: any) {
        handleSupabaseError("updateStoryState", err);
      }
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
          .neq("timestamp", "1970-01-01T00:00:00Z");

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
