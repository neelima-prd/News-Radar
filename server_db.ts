/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Briefing, BriefingCard, UserPreferences } from "./src/types.js";

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
      return trimmed
        .slice(1, -1)
        .split(",")
        .map(item => item.trim().replace(/^"|"$/g, "").replace(/\\"/g, '"'))
        .filter(Boolean);
    }
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
          preferences: DEFAULT_PREFS
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2), "utf-8");
        return initialDB;
      }
      return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    } catch (e) {
      console.error("Failed to load local DB, fallback to memory", e);
      return {
        briefings: seedBriefings(),
        preferences: DEFAULT_PREFS
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
            briefing_frequency_hours: (Number(data.briefing_frequency_hours) || 6) as any
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
}
