/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import crypto, { randomUUID } from "crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Briefing, BriefingCard, UserPreferences } from "./src/types.js";

let supabaseClient: SupabaseClient | null = null;
let supabaseDisabled = false;
let lastSupabaseCheckTime = 0;
let cachedResolvedUserId: string | null = null;

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

function stringToUUID(str: string): string {
  const hash = crypto.createHash("md5").update(str).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

const DB_FILE = process.env.VERCEL
  ? "/tmp/db.json"
  : path.join(process.cwd(), "db.json");

export interface PushSubscriptionRecord {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
  user_agent?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface DBStructure {
  briefings: Briefing[];
  preferences: UserPreferences;
  user_story_states?: Record<string, string[]>;
  notification_subscriptions?: PushSubscriptionRecord[];
}

const DEFAULT_PREFS: UserPreferences = {
  topics: ["technology", "startups"],
  briefing_frequency_hours: 6,
  notifications_enabled: false
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
            { title: "OpenAI releases Realtime API for multi-modal audio applications", url: "https://techcrunch.com/2024/10/openai-realtime-api", source: "TechCrunch" },
            { title: "Show HN: Building voice bots with OpenAI's new audio endpoint", url: "https://news.ycombinator.com/item?id=4171234", source: "Hacker News" }
          ],
          image_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
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
            { title: "YC Launches new directory tool to pair founders by skill embeddings", url: "https://techcrunch.com/2024/09/yc-cofounder-matching", source: "TechCrunch" }
          ],
          image_url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80",
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
            { title: "Anthropic brings interactive Artifacts canvas to enterprise teams", url: "https://venturebeat.com/ai/anthropic-claude-artifacts-teams", source: "VentureBeat" }
          ],
          image_url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80",
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
            { title: "TSMC breaks ground on sub-2nm fab in Europe", url: "https://news.ycombinator.com/item?id=4189001", source: "Hacker News" }
          ],
          image_url: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
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
            { title: "YC edge compiler startup raises $12M pre-seed", url: "https://techcrunch.com/2024/08/edge-compiler-12m", source: "TechCrunch" }
          ],
          image_url: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80",
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
          .select(`
            *,
            briefing_items (
              *,
              articles (
                *,
                sources (*)
              )
            )
          `)
          .order("generated_at", { ascending: false });

        if (error) {
          handleSupabaseError("getBriefings", error);
        } else if (data && data.length > 0) {
          return data.map((b: any) => {
            const items = Array.isArray(b.briefing_items) ? b.briefing_items : [];
            items.sort((a: any, b: any) => (a.rank || 0) - (b.rank || 0));

            const cards: BriefingCard[] = items.map((item: any) => {
              const art = item.articles;
              const src = art?.sources;

              let sourceArticles: Array<{ title: string; url: string; source: string; image_url?: string }> = [];

              if (art && art.url) {
                sourceArticles = [{
                  title: art.title || item.headline,
                  url: art.url,
                  source: src?.name || art.source || "News Source",
                  image_url: art.image_url || undefined
                }];
              } else {
                const rawSources = safeParseArray(item.source_articles || []);
                if (rawSources.length > 0) {
                  sourceArticles = rawSources.map((s: any) => (typeof s === "string" ? { title: item.headline, url: s, source: item.category || "Technology" } : s));
                }
              }

              if (sourceArticles.length === 0) {
                sourceArticles = [{
                  title: item.headline || "Coverage Article",
                  url: "https://techcrunch.com",
                  source: item.category || "Technology"
                }];
              }

              const firstArticle = sourceArticles[0];
              const imageUrl = item.image_url || art?.image_url || (typeof firstArticle === 'object' && firstArticle && 'image_url' in firstArticle ? (firstArticle as any).image_url : undefined);

              return {
                id: item.id,
                briefing_id: item.briefing_id,
                rank: item.rank,
                priority: item.priority || "IMPORTANT",
                headline: item.headline,
                summary: item.summary,
                why_it_matters: item.why_it_matters,
                category: item.category,
                why_selected: safeParseArray(item.why_selected),
                source_articles: sourceArticles,
                image_url: imageUrl,
                isRead: false
              };
            });

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

        // 2. Ensure sources and articles exist in relational tables
        if (briefing.cards && briefing.cards.length > 0) {
          const itemsToInsert: any[] = [];

          for (const card of briefing.cards) {
            const cardId = isValidUUID(card.id) ? card.id : randomUUID();
            const primarySource = card.source_articles?.[0];
            let articleId: string | null = null;

            if (primarySource && primarySource.url) {
              const sourceName = primarySource.source || "News Source";
              let baseUrl = "https://techcrunch.com";
              let feedUrl = "https://techcrunch.com/feed/";

              try {
                const parsed = new URL(primarySource.url);
                baseUrl = `${parsed.protocol}//${parsed.hostname}`;
                feedUrl = `${baseUrl}/rss`;
              } catch (_) {}

              // Find or create source row
              let sourceId: string | null = null;
              const { data: existingSources } = await supabase
                .from("sources")
                .select("id")
                .eq("name", sourceName)
                .limit(1);

              if (existingSources && existingSources.length > 0) {
                sourceId = existingSources[0].id;
              } else {
                sourceId = randomUUID();
                try {
                  await supabase.from("sources").insert([{
                    id: sourceId,
                    name: sourceName,
                    base_url: baseUrl,
                    feed_url: feedUrl
                  }]);
                } catch (_) {}
              }

              // Find or create article row
              const { data: existingArticles } = await supabase
                .from("articles")
                .select("id, image_url")
                .eq("url", primarySource.url)
                .limit(1);

              const newImage = card.image_url || primarySource.image_url;

              if (existingArticles && existingArticles.length > 0) {
                articleId = existingArticles[0].id;
                if (newImage && !existingArticles[0].image_url) {
                  try {
                    await supabase.from("articles").update({ image_url: newImage }).eq("id", articleId);
                  } catch (_) {}
                }
              } else {
                articleId = randomUUID();
                try {
                  await supabase.from("articles").insert([{
                    id: articleId,
                    source_id: sourceId,
                    title: primarySource.title || card.headline,
                    url: primarySource.url,
                    image_url: newImage || null,
                    content: card.summary || null,
                    published_at: new Date().toISOString()
                  }]);
                } catch (_) {}
              }
            }

            itemsToInsert.push({
              id: cardId,
              briefing_id: briefingId,
              rank: card.rank || 1,
              priority: card.priority || "IMPORTANT",
              category: card.category || "Technology",
              headline: card.headline,
              summary: card.summary,
              why_it_matters: card.why_it_matters,
              why_selected: card.why_selected || [],
              source_article_id: articleId
            });
          }

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

  static async resolveSupabaseUserId(userIdentifier?: string): Promise<string | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    if (userIdentifier && isValidUUID(userIdentifier)) {
      return userIdentifier;
    }

    if (cachedResolvedUserId) {
      return cachedResolvedUserId;
    }

    try {
      // 1. Try to find any user profile in public.profiles
      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("id")
        .limit(1);

      if (!profErr && profiles && profiles.length > 0 && profiles[0]?.id) {
        cachedResolvedUserId = profiles[0].id;
        return cachedResolvedUserId;
      }

      // 2. Try to find any existing user in user_preferences
      const { data: prefs, error: prefErr } = await supabase
        .from("user_preferences")
        .select("user_id")
        .limit(1);

      if (!prefErr && prefs && prefs.length > 0 && prefs[0]?.user_id) {
        cachedResolvedUserId = prefs[0].user_id;
        return cachedResolvedUserId;
      }

      // 3. Try to query auth.users if service role admin is available
      if (supabase.auth && (supabase.auth as any).admin) {
        try {
          const { data: usersData, error: adminErr } = await (supabase.auth as any).admin.listUsers({ page: 1, perPage: 1 });
          if (!adminErr && usersData?.users && usersData.users.length > 0) {
            cachedResolvedUserId = usersData.users[0].id;
            return cachedResolvedUserId;
          }

          // Auto-create a default user in auth.users if completely empty and service role is available
          const defaultEmail = userIdentifier && userIdentifier.includes("@") ? userIdentifier : "radar-user@newsradar.internal";
          const { data: newUser, error: createErr } = await (supabase.auth as any).admin.createUser({
            email: defaultEmail,
            email_confirm: true,
            user_metadata: { role: "radar_user" }
          });
          if (!createErr && newUser?.user?.id) {
            cachedResolvedUserId = newUser.user.id;
            return cachedResolvedUserId;
          }
        } catch (adminEx) {
          console.warn("[Database] Supabase admin user resolution notice:", adminEx);
        }
      }

      const fallbackId = userIdentifier ? stringToUUID(userIdentifier) : stringToUUID("default");
      return fallbackId;
    } catch (err) {
      console.warn("[Database] resolveSupabaseUserId warning:", err);
      return userIdentifier && isValidUUID(userIdentifier) ? userIdentifier : stringToUUID("default");
    }
  }

  static async getPreferences(userEmail?: string): Promise<UserPreferences> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const userId = await this.resolveSupabaseUserId(userEmail);
        if (userId) {
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
              notifications_enabled: data.notifications_enabled === true
            };
          }
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
    if (supabase) {
      try {
        const userId = await this.resolveSupabaseUserId(userEmail);
        if (userId) {
          const payload: any = {
            user_id: userId,
            topics: preferences.topics,
            briefing_frequency_hours: preferences.briefing_frequency_hours,
            updated_at: new Date().toISOString()
          };
          if (typeof preferences.notifications_enabled === 'boolean') {
            payload.notifications_enabled = preferences.notifications_enabled;
          }

          const { error } = await supabase
            .from("user_preferences")
            .upsert(payload, { onConflict: "user_id" });

          if (error) {
            handleSupabaseError("savePreferences", error);
          }
        }
      } catch (err: any) {
        handleSupabaseError("savePreferences", err);
      }
    }
  }

  static async savePushSubscription(
    userId: string,
    subscription: { endpoint: string; p256dh: string; auth_key: string; user_agent?: string }
  ): Promise<void> {
    const db = this.loadDB();
    if (!db.notification_subscriptions) {
      db.notification_subscriptions = [];
    }

    const existingIdx = db.notification_subscriptions.findIndex(
      s => s.user_id === userId && s.endpoint === subscription.endpoint
    );

    const now = new Date().toISOString();
    const record: PushSubscriptionRecord = {
      id: existingIdx >= 0 ? db.notification_subscriptions[existingIdx].id : randomUUID(),
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth_key: subscription.auth_key,
      user_agent: subscription.user_agent,
      is_active: true,
      created_at: existingIdx >= 0 ? db.notification_subscriptions[existingIdx].created_at : now,
      updated_at: now
    };

    if (existingIdx >= 0) {
      db.notification_subscriptions[existingIdx] = record;
    } else {
      db.notification_subscriptions.push(record);
    }
    this.saveDB(db);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        let targetUserId = await this.resolveSupabaseUserId(userId);
        if (!targetUserId) {
          targetUserId = stringToUUID(userId || "default");
        }

        // Check if row already exists for this endpoint
        const { data: existingRows, error: findErr } = await supabase
          .from("notification_subscriptions")
          .select("id")
          .eq("endpoint", subscription.endpoint)
          .limit(1);

        if (!findErr && existingRows && existingRows.length > 0) {
          const { error: updateErr } = await supabase
            .from("notification_subscriptions")
            .update({
              user_id: targetUserId,
              p256dh: subscription.p256dh,
              auth_key: subscription.auth_key,
              user_agent: subscription.user_agent || null,
              is_active: true,
              updated_at: now
            })
            .eq("id", existingRows[0].id);

          if (updateErr) {
            handleSupabaseError("savePushSubscription update", updateErr);
          } else {
            console.info(`[Database] Supabase push subscription updated for user: ${targetUserId}`);
          }
        } else {
          // Insert new subscription record
          const { error: insertErr } = await supabase
            .from("notification_subscriptions")
            .insert([{
              id: randomUUID(),
              user_id: targetUserId,
              endpoint: subscription.endpoint,
              p256dh: subscription.p256dh,
              auth_key: subscription.auth_key,
              user_agent: subscription.user_agent || null,
              is_active: true,
              created_at: now,
              updated_at: now
            }]);

          if (insertErr) {
            // If foreign key failed, retry with any profile ID from database
            if (insertErr.message?.includes("foreign key") || insertErr.message?.includes("fkey")) {
              const { data: anyProf } = await supabase.from("profiles").select("id").limit(1);
              if (anyProf && anyProf.length > 0 && anyProf[0].id) {
                cachedResolvedUserId = anyProf[0].id;
                const { error: retryErr } = await supabase
                  .from("notification_subscriptions")
                  .insert([{
                    id: randomUUID(),
                    user_id: anyProf[0].id,
                    endpoint: subscription.endpoint,
                    p256dh: subscription.p256dh,
                    auth_key: subscription.auth_key,
                    user_agent: subscription.user_agent || null,
                    is_active: true,
                    created_at: now,
                    updated_at: now
                  }]);
                if (retryErr) {
                  handleSupabaseError("savePushSubscription retry", retryErr);
                } else {
                  console.info(`[Database] Supabase push subscription inserted with profile ID: ${anyProf[0].id}`);
                }
                return;
              }
            }
            handleSupabaseError("savePushSubscription insert", insertErr);
          } else {
            console.info(`[Database] Supabase push subscription created for user: ${targetUserId}`);
          }
        }
      } catch (err: any) {
        handleSupabaseError("savePushSubscription", err);
      }
    }
  }

  static async getUserPushSubscriptions(userId: string): Promise<PushSubscriptionRecord[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const targetUserId = await this.resolveSupabaseUserId(userId);
        let query = supabase
          .from("notification_subscriptions")
          .select("*")
          .eq("is_active", true);

        if (targetUserId) {
          query = query.eq("user_id", targetUserId);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data;
        }

        // Fallback: check all active subscriptions in Supabase
        const { data: allActive } = await supabase
          .from("notification_subscriptions")
          .select("*")
          .eq("is_active", true);

        if (allActive && allActive.length > 0) {
          return allActive;
        }
      } catch (err: any) {
        handleSupabaseError("getUserPushSubscriptions", err);
      }
    }

    const db = this.loadDB();
    return (db.notification_subscriptions || []).filter(
      s => s.user_id === userId && s.is_active
    );
  }

  static async deactivatePushSubscription(endpoint: string): Promise<void> {
    const db = this.loadDB();
    if (db.notification_subscriptions) {
      db.notification_subscriptions = db.notification_subscriptions.map(s =>
        s.endpoint === endpoint ? { ...s, is_active: false, updated_at: new Date().toISOString() } : s
      );
      this.saveDB(db);
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase
          .from("notification_subscriptions")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("endpoint", endpoint);

        if (error) {
          handleSupabaseError("deactivatePushSubscription", error);
        }
      } catch (err: any) {
        handleSupabaseError("deactivatePushSubscription", err);
      }
    }
  }

  static async getUsersDueForBriefing(): Promise<{ userId: string; frequencyHours: number; topics: string[] }[]> {
    const dueUsers: { userId: string; frequencyHours: number; topics: string[] }[] = [];
    const supabase = getSupabaseClient();

    if (supabase) {
      try {
        const { data: prefs, error } = await supabase
          .from("user_preferences")
          .select("user_id, briefing_frequency_hours, notifications_enabled, topics")
          .eq("notifications_enabled", true);

        if (!error && prefs) {
          for (const pref of prefs) {
            const freqHours = Number(pref.briefing_frequency_hours) || 6;
            // Check latest briefing for this user
            const { data: latestBriefing } = await supabase
              .from("briefings")
              .select("generated_at")
              .eq("user_id", pref.user_id)
              .order("generated_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (!latestBriefing) {
              // Never received a briefing, generate first one
              dueUsers.push({
                userId: pref.user_id,
                frequencyHours: freqHours,
                topics: safeParseArray(pref.topics || ["technology", "startups"])
              });
            } else {
              const lastGenTime = new Date(latestBriefing.generated_at).getTime();
              const elapsedHours = (Date.now() - lastGenTime) / (1000 * 60 * 60);
              // Allow a 5 minute grace margin
              if (elapsedHours >= (freqHours - 0.08)) {
                dueUsers.push({
                  userId: pref.user_id,
                  frequencyHours: freqHours,
                  topics: safeParseArray(pref.topics || ["technology", "startups"])
                });
              }
            }
          }
          return dueUsers;
        }
      } catch (err: any) {
        handleSupabaseError("getUsersDueForBriefing", err);
      }
    }

    // Local DB fallback
    const db = this.loadDB();
    if (db.preferences?.notifications_enabled) {
      const freqHours = db.preferences.briefing_frequency_hours || 6;
      const latest = db.briefings?.[0];
      if (!latest) {
        dueUsers.push({
          userId: "default",
          frequencyHours: freqHours,
          topics: db.preferences.topics || ["technology", "startups"]
        });
      } else {
        const lastGenTime = new Date(latest.generated_at).getTime();
        const elapsedHours = (Date.now() - lastGenTime) / (1000 * 60 * 60);
        if (elapsedHours >= (freqHours - 0.08)) {
          dueUsers.push({
            userId: "default",
            frequencyHours: freqHours,
            topics: db.preferences.topics || ["technology", "startups"]
          });
        }
      }
    }

    return dueUsers;
  }

  static async getReadStoryIds(userId?: string): Promise<string[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const resolvedUserId = await this.resolveSupabaseUserId(userId);
        if (resolvedUserId) {
          const { data, error } = await supabase
            .from("user_story_state")
            .select("briefing_item_id, status")
            .eq("user_id", resolvedUserId)
            .eq("status", "read");

          if (error) {
            handleSupabaseError("getReadStoryIds", error);
          } else if (data) {
            return data.map((d: any) => d.briefing_item_id);
          }
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
    if (supabase && isValidUUID(cardId)) {
      try {
        const resolvedUserId = await this.resolveSupabaseUserId(userId);
        if (resolvedUserId) {
          const { error } = await supabase
            .from("user_story_state")
            .upsert({
              user_id: resolvedUserId,
              briefing_item_id: cardId,
              status: isRead ? "read" : "unread",
              read_at: isRead ? new Date().toISOString() : null,
              updated_at: new Date().toISOString()
            });

          if (error) {
            handleSupabaseError("updateStoryState", error);
          }
        }
      } catch (err: any) {
        handleSupabaseError("updateStoryState", err);
      }
    }
  }
}

export const DatabaseService = DBManager;

