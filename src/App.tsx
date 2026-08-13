/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Briefing, UserPreferences } from "./types";
import { Sidebar } from "./components/Sidebar";
import { HeaderBar } from "./components/HeaderBar";
import { StoryQueue } from "./components/StoryQueue";
import { ActiveStoryPanel } from "./components/ActiveStoryPanel";
import { BriefingCompletionView } from "./components/BriefingCompletionView";
import { ArchivesWorkspace } from "./components/ArchivesWorkspace";
import { PreferencesModal } from "./components/PreferencesModal";

export function RadarLogo({
  size = 32,
  theme = "dark"
}: {
  size?: number;
  theme?: "dark" | "light";
}) {
  const isDark = theme === "dark";
  const primaryColor = isDark ? "#00E5FF" : "#0284C7";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <defs>
        <filter id="radar-neon-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={isDark ? "3" : "1.8"} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle
        cx="50"
        cy="50"
        r="7.5"
        fill={primaryColor}
        filter="url(#radar-neon-glow)"
      />

      <circle
        cx="50"
        cy="50"
        r="15"
        stroke={primaryColor}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="47.1 47.1"
        transform="rotate(90, 50, 50)"
        filter="url(#radar-neon-glow)"
      />
      <circle
        cx="50"
        cy="50"
        r="25"
        stroke={primaryColor}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="87.2 69.8"
        transform="rotate(80, 50, 50)"
        filter="url(#radar-neon-glow)"
      />
      <circle
        cx="50"
        cy="50"
        r="35"
        stroke={primaryColor}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="134.4 85.5"
        transform="rotate(70, 50, 50)"
        filter="url(#radar-neon-glow)"
      />
      <circle
        cx="50"
        cy="50"
        r="45"
        stroke={primaryColor}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="188.5 94.2"
        transform="rotate(60, 50, 50)"
        filter="url(#radar-neon-glow)"
      />

      <circle
        cx="50"
        cy="50"
        r="18"
        stroke={primaryColor}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="44.0 69.1"
        transform="rotate(-70, 50, 50)"
        filter="url(#radar-neon-glow)"
      />
      <circle
        cx="50"
        cy="50"
        r="28"
        stroke={primaryColor}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="73.3 102.6"
        transform="rotate(-75, 50, 50)"
        filter="url(#radar-neon-glow)"
      />
      <circle
        cx="50"
        cy="50"
        r="38"
        stroke={primaryColor}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="106.1 132.6"
        transform="rotate(-80, 50, 50)"
        filter="url(#radar-neon-glow)"
      />
    </svg>
  );
}

export default function App() {
  // App state
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>({
    topics: ["technology", "startups"],
    briefing_frequency_hours: 6
  });
  const [loadingRadar, setLoadingRadar] = useState(false);
  const [radarError, setRadarError] = useState<string | null>(null);
  const [isKeyError, setIsKeyError] = useState(false);

  // Supabase Auth state
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Theme support
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Navigation tab
  const [activeTab, setActiveTab] = useState<"latest" | "archives">("latest");

  // Preferences modal view state
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);

  // Read story IDs state
  const [readStoryIds, setReadStoryIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("news_radar_read_story_ids");
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  // Currently selected active story ID in queue
  const [activeCardId, setActiveCardId] = useState<string>("");

  useEffect(() => {
    try {
      localStorage.setItem("news_radar_read_story_ids", JSON.stringify(readStoryIds));
    } catch (_) {}
  }, [readStoryIds]);

  const loadData = async (activeSession?: any) => {
    const currentSession = activeSession !== undefined ? activeSession : session;
    const userId = currentSession?.user?.id || "default";
    const headers: Record<string, string> = {
      "x-user-email": userId
    };

    try {
      const briefingsRes = await fetch("/api/briefings", { headers });
      if (briefingsRes.ok) {
        const briefs = await briefingsRes.json();
        setBriefings(briefs);
      }

      const prefRes = await fetch("/api/preferences", { headers });
      if (prefRes.ok) {
        const prefs = await prefRes.json();
        setPreferences(prefs);
      }

      const stateRes = await fetch("/api/story_state", { headers });
      if (stateRes.ok) {
        const readIds = await stateRes.json();
        if (Array.isArray(readIds) && readIds.length > 0) {
          setReadStoryIds(readIds);
        }
      }
    } catch (e) {
      console.warn("Notice: Fetching state falling back to local defaults:", e);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const configRes = await fetch("/api/config");
        if (configRes.ok) {
          const config = await configRes.json();
          if (config.supabaseUrl && config.supabaseAnonKey) {
            try {
              const { createClient } = await import("@supabase/supabase-js");
              const client = createClient(config.supabaseUrl, config.supabaseAnonKey);

              let currentSession = null;
              try {
                const sessionRes = await client.auth.getSession().catch(() => null);
                currentSession = sessionRes?.data?.session || null;
                if (!currentSession) {
                  const { data: anonData, error: anonError } = await client.auth
                    .signInAnonymously()
                    .catch(() => ({
                      data: null,
                      error: { message: "Failed to fetch" }
                    }));
                  if (!anonError && anonData?.session) {
                    currentSession = anonData.session;
                  }
                }
              } catch (authErr) {
                console.info("Supabase client auth offline, continuing in local mode.");
              }

              setSession(currentSession);
              await loadData(currentSession);

              client.auth.onAuthStateChange((_event, newSession) => {
                setSession(newSession);
                if (newSession) {
                  loadData(newSession);
                }
              });

              setAuthLoading(false);
            } catch (supErr) {
              console.warn(
                "Supabase client init failed, falling back to standard mode:",
                supErr
              );
              setAuthLoading(false);
              await loadData(null);
            }
          } else {
            setAuthLoading(false);
            await loadData(null);
          }
        } else {
          setAuthLoading(false);
          await loadData(null);
        }
      } catch (err) {
        console.info("Auth initialization proceeding in standard mode:", err);
        setAuthLoading(false);
        await loadData(null);
      }
    };

    initAuth();
  }, []);

  const handleSavePreferences = async (updated: UserPreferences) => {
    setPreferences(updated);
    const userId = session?.user?.id || "default";
    try {
      const response = await fetch("/api/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userId
        },
        body: JSON.stringify(updated)
      });
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
      }
    } catch (e) {
      console.warn("Notice: Error saving preferences:", e);
    }
  };

  const handleRefreshBriefing = async () => {
    if (loadingRadar) return;

    setLoadingRadar(true);
    setRadarError(null);
    setIsKeyError(false);

    const userId = session?.user?.id || "default";

    try {
      const response = await fetch("/api/briefings/generate", {
        method: "POST",
        headers: {
          "x-user-email": userId
        }
      });

      let data: any = null;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        try {
          data = await response.json();
        } catch (_) {}
      }

      if (!response.ok) {
        if (data && data.isKeyError) {
          setIsKeyError(true);
        }
        const errorMsg =
          data?.error || `Briefing refresh failed (HTTP ${response.status}).`;
        throw new Error(errorMsg);
      }

      if (!data) {
        throw new Error("Empty response received from intelligence servers.");
      }

      await loadData();
    } catch (err: any) {
      setRadarError(err.message || "Refresh failed.");
    } finally {
      setLoadingRadar(false);
    }
  };

  const activeBriefing = briefings[0] || null;
  const historicBriefings = briefings.slice(1);

  const cards = activeBriefing?.cards || [];
  const totalStoriesCount = cards.length;
  const unreadStories = cards.filter((c) => !readStoryIds.includes(c.id));
  const unreadCount = unreadStories.length;
  const readStoriesCount = totalStoriesCount - unreadCount;

  // Set activeCardId when activeBriefing changes or on load
  useEffect(() => {
    if (cards.length > 0) {
      const hasActiveCard = cards.some((c) => c.id === activeCardId);
      if (!hasActiveCard) {
        // Default to first unread card, or first card overall
        const firstUnread = cards.find((c) => !readStoryIds.includes(c.id));
        setActiveCardId(firstUnread ? firstUnread.id : cards[0].id);
      }
    }
  }, [cards, activeCardId, readStoryIds]);

  const handleMarkAsRead = async (cardId: string) => {
    const isCurrentlyRead = readStoryIds.includes(cardId);
    const nextReadState = !isCurrentlyRead;

    setReadStoryIds((prev) => {
      if (isCurrentlyRead) {
        return prev.filter((id) => id !== cardId);
      } else {
        return [...prev, cardId];
      }
    });

    try {
      await fetch("/api/story_state", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": session?.user?.id || "default"
        },
        body: JSON.stringify({ card_id: cardId, is_read: nextReadState })
      });
    } catch (e) {
      console.warn("Failed to persist story state:", e);
    }
  };

  const handleNextStory = () => {
    if (cards.length === 0) return;

    const currentIndex = cards.findIndex((c) => c.id === activeCardId);
    const currentCard = cards[currentIndex];

    if (currentCard && !readStoryIds.includes(currentCard.id)) {
      handleMarkAsRead(currentCard.id);
    }

    // Find next unread card, or next index
    const nextUnreadIndex = cards.findIndex(
      (c, idx) => idx > currentIndex && !readStoryIds.includes(c.id)
    );

    if (nextUnreadIndex !== -1) {
      setActiveCardId(cards[nextUnreadIndex].id);
    } else if (currentIndex < cards.length - 1) {
      setActiveCardId(cards[currentIndex + 1].id);
    } else {
      // Loop or stay on completion
      const anyUnread = cards.find((c) => !readStoryIds.includes(c.id));
      if (anyUnread) {
        setActiveCardId(anyUnread.id);
      }
    }
  };

  const getFormattedNextBriefingTime = () => {
    if (!activeBriefing) return "6:00 PM";
    const genTime = new Date(activeBriefing.generated_at).getTime();
    const freqHours = preferences?.briefing_frequency_hours || 6;
    let nextTime = new Date(genTime + freqHours * 60 * 60 * 1000);
    const now = new Date();
    if (nextTime.getTime() < now.getTime()) {
      nextTime = new Date(now.getTime() + freqHours * 60 * 60 * 1000);
    }
    return nextTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const activeCardIndex = cards.findIndex((c) => c.id === activeCardId);
  const activeCard = cards[activeCardIndex] || cards[0] || null;

  if (authLoading) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center p-6 select-none transition-colors duration-200 ${
          theme === "dark" ? "bg-[#0b0f19] text-slate-100" : "bg-[#fcfdfd] text-[#111827]"
        }`}
      >
        <div className="flex flex-col items-center gap-6 max-w-sm text-center">
          <div className="relative flex items-center justify-center animate-pulse">
            <div className="absolute inset-0 bg-cyan-500/20 rounded-full filter blur-xl"></div>
            <RadarLogo size={80} theme={theme} />
          </div>
          <div className="space-y-2">
            <h2
              className={`text-lg font-black tracking-widest uppercase ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              NEWS RADAR
            </h2>
            <p className="text-[10px] text-cyan-400 font-extrabold uppercase tracking-widest">
              Loading News Radar briefing...
            </p>
          </div>
          <RefreshCw size={16} className="text-cyan-400 animate-spin mt-2" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex font-sans antialiased selection:bg-cyan-500/30 transition-colors duration-200 ${
        theme === "dark" ? "bg-[#0b0f19] text-slate-100" : "bg-[#fcfdfd] text-[#111827]"
      }`}
    >
      {/* LEFT SIDEBAR (Desktop) */}
      <Sidebar
        activeTab={activeTab === "archives" ? "archives" : "latest"}
        onSelectTab={(tab) => {
          if (tab === "preferences") {
            setShowPreferencesModal(true);
          } else {
            setActiveTab(tab);
          }
        }}
        theme={theme}
      />

      {/* MAIN DESKTOP BRIEFING WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Missing API Key Warning */}
        {isKeyError && (
          <div className="bg-red-600 text-white px-6 py-3 text-center text-xs font-bold flex items-center justify-center gap-2.5 shadow-md">
            <AlertTriangle size={15} className="shrink-0 animate-bounce" />
            <span>
              <strong>Gemini API Key Needed:</strong> Set your GEMINI_API_KEY environment variable.
            </span>
          </div>
        )}

        {/* HEADER BAR */}
        <HeaderBar
          totalStoriesCount={totalStoriesCount}
          readStoriesCount={readStoriesCount}
          loadingRadar={loadingRadar}
          onRefreshBriefing={handleRefreshBriefing}
          theme={theme}
          onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
        />

        {/* WORKSPACE BODY */}
        <main className="flex-1 overflow-y-auto">
          {radarError && (
            <div className="max-w-7xl mx-auto px-6 pt-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-xs text-red-400 flex items-start gap-3">
                <AlertTriangle size={15} className="shrink-0 mt-0.5 text-red-400" />
                <div>
                  <p className="font-extrabold">Briefing Generation Issue</p>
                  <p className="text-red-300 font-medium mt-0.5">{radarError}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "latest" ? (
            <div className="max-w-7xl mx-auto w-full px-6 py-6 space-y-6">
              {/* If no stories in briefing */}
              {cards.length === 0 ? (
                <div
                  className={`border border-dashed rounded-2xl p-12 text-center max-w-xl mx-auto my-12 ${
                    theme === "dark"
                      ? "bg-[#0f1524] border-slate-800 text-slate-300"
                      : "bg-white border-gray-200 text-gray-700"
                  }`}
                >
                  <RadarLogo size={48} theme={theme} />
                  <h3 className="text-lg font-bold mt-4">Your briefing is empty</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Click &ldquo;Refresh Briefing&rdquo; to analyze the latest technology updates and generate your personalized brief.
                  </p>
                  <button
                    type="button"
                    onClick={handleRefreshBriefing}
                    disabled={loadingRadar}
                    className="mt-5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                  >
                    {loadingRadar ? "Generating..." : "Generate Briefing"}
                  </button>
                </div>
              ) : unreadCount === 0 && totalStoriesCount > 0 ? (
                /* Briefing Completion Card View when 100% completed */
                <BriefingCompletionView
                  nextBriefingTime={getFormattedNextBriefingTime()}
                  onBrowseArchive={() => setActiveTab("archives")}
                  onReviewAgain={() => {
                    if (cards[0]) setActiveCardId(cards[0].id);
                  }}
                  theme={theme}
                />
              ) : (
                /* Desktop Two-Column Workspace Layout */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column (35% -> 4 cols) */}
                  <div className="lg:col-span-4 lg:sticky lg:top-20">
                    <StoryQueue
                      cards={cards}
                      activeCardId={activeCardId}
                      readStoryIds={readStoryIds}
                      onSelectStory={(cardId) => setActiveCardId(cardId)}
                      theme={theme}
                    />
                  </div>

                  {/* Right Column (65% -> 8 cols) */}
                  <div className="lg:col-span-8">
                    {activeCard && (
                      <ActiveStoryPanel
                        card={activeCard}
                        isRead={readStoryIds.includes(activeCard.id)}
                        onMarkAsRead={() => handleMarkAsRead(activeCard.id)}
                        onNextStory={handleNextStory}
                        hasNextStory={activeCardIndex < cards.length - 1}
                        theme={theme}
                        storyIndex={activeCardIndex}
                        totalStories={cards.length}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Tab 2: Archives Workspace */
            <ArchivesWorkspace
              historicBriefings={historicBriefings}
              readStoryIds={readStoryIds}
              onMarkAsRead={handleMarkAsRead}
              theme={theme}
            />
          )}
        </main>
      </div>

      {/* Preferences Modal */}
      {showPreferencesModal && (
        <PreferencesModal
          preferences={preferences}
          onSavePreferences={handleSavePreferences}
          onClose={() => setShowPreferencesModal(false)}
          theme={theme}
        />
      )}
    </div>
  );
}
