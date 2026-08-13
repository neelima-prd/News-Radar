/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import {
  Sparkles,
  RefreshCw,
  History,
  User,
  Check,
  AlertTriangle,
  ArrowRight,
  Settings,
  X,
  Moon,
  Sun,
  Zap,
  CheckCircle2
} from "lucide-react";
import { Briefing, UserPreferences } from "./types";
import { InsightCard } from "./components/InsightCard";
import { motion, AnimatePresence } from "motion/react";

export function RadarLogo({ size = 32, theme = "dark" }: { size?: number; theme?: "dark" | "light" }) {
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

      <circle cx="50" cy="50" r="7.5" fill={primaryColor} filter="url(#radar-neon-glow)" />

      <circle cx="50" cy="50" r="15" stroke={primaryColor} strokeWidth="4" strokeLinecap="round" strokeDasharray="47.1 47.1" transform="rotate(90, 50, 50)" filter="url(#radar-neon-glow)" />
      <circle cx="50" cy="50" r="25" stroke={primaryColor} strokeWidth="4" strokeLinecap="round" strokeDasharray="87.2 69.8" transform="rotate(80, 50, 50)" filter="url(#radar-neon-glow)" />
      <circle cx="50" cy="50" r="35" stroke={primaryColor} strokeWidth="4" strokeLinecap="round" strokeDasharray="134.4 85.5" transform="rotate(70, 50, 50)" filter="url(#radar-neon-glow)" />
      <circle cx="50" cy="50" r="45" stroke={primaryColor} strokeWidth="4" strokeLinecap="round" strokeDasharray="188.5 94.2" transform="rotate(60, 50, 50)" filter="url(#radar-neon-glow)" />

      <circle cx="50" cy="50" r="18" stroke={primaryColor} strokeWidth="4" strokeLinecap="round" strokeDasharray="44.0 69.1" transform="rotate(-70, 50, 50)" filter="url(#radar-neon-glow)" />
      <circle cx="50" cy="50" r="28" stroke={primaryColor} strokeWidth="4" strokeLinecap="round" strokeDasharray="73.3 102.6" transform="rotate(-75, 50, 50)" filter="url(#radar-neon-glow)" />
      <circle cx="50" cy="50" r="38" stroke={primaryColor} strokeWidth="4" strokeLinecap="round" strokeDasharray="106.1 132.6" transform="rotate(-80, 50, 50)" filter="url(#radar-neon-glow)" />
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

  // Supabase Auth and Config states
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Theme support
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Sidebar navigation active state
  const [activeTab, setActiveTab] = useState<"latest" | "archives">("latest");

  // Reading state indicators
  const [readStoryIds, setReadStoryIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("news_radar_read_story_ids");
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  const [activeCardId, setActiveCardId] = useState<string>("");

  useEffect(() => {
    try {
      localStorage.setItem("news_radar_read_story_ids", JSON.stringify(readStoryIds));
    } catch (_) {}
  }, [readStoryIds]);

  // Preference editor drawer state
  const [showPreferencesPanel, setShowPreferencesPanel] = useState(false);

  // Time stamp state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const availableTopics = [
    { id: "technology", label: "Technology", active: true },
    { id: "startups", label: "Startups", active: true },
    { id: "ai_ml", label: "AI & Machine Learning", active: false, comingSoon: true },
    { id: "india_biz", label: "India Business & Technology", active: false, comingSoon: true },
    { id: "business", label: "Business", active: false, comingSoon: true },
    { id: "markets", label: "Markets", active: false, comingSoon: true }
  ];

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

              // Supabase Anonymous Auth - automatically sign in on first open
              let currentSession = null;
              try {
                const sessionRes = await client.auth.getSession().catch(() => null);
                currentSession = sessionRes?.data?.session || null;
                if (!currentSession) {
                  const { data: anonData, error: anonError } = await client.auth.signInAnonymously().catch(() => ({ data: null, error: { message: "Failed to fetch" } }));
                  if (!anonError && anonData?.session) {
                    currentSession = anonData.session;
                  }
                }
              } catch (authErr) {
                console.info("Supabase client auth offline, continuing in local mode.");
              }

              setSession(currentSession);
              await loadData(currentSession);

              // Listen to auth changes
              client.auth.onAuthStateChange((_event, newSession) => {
                setSession(newSession);
                if (newSession) {
                  loadData(newSession);
                }
              });

              setAuthLoading(false);
            } catch (supErr) {
              console.warn("Supabase client init failed, falling back to standard mode:", supErr);
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

  const handleTopicToggle = (topicId: string) => {
    const currentTopics = preferences?.topics || [];
    let updatedTopics: string[];
    if (currentTopics.includes(topicId)) {
      if (currentTopics.length <= 1) return; // Maintain at least one topic
      updatedTopics = currentTopics.filter(t => t !== topicId);
    } else {
      updatedTopics = [...currentTopics, topicId];
    }
    const updatedPrefs = {
      ...preferences,
      topics: updatedTopics
    };
    setPreferences(updatedPrefs);
    handleSavePreferences(updatedPrefs);
  };

  const handleFrequencyChange = (freqHours: number) => {
    if (!preferences) return;
    const updatedPrefs = {
      ...preferences,
      briefing_frequency_hours: freqHours
    };
    setPreferences(updatedPrefs);
    handleSavePreferences(updatedPrefs);
  };

  const handleSavePreferences = async (updated: UserPreferences) => {
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

  // Triggers professional synthesis briefing generation
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
        const errorMsg = data?.error || `Briefing refresh failed (HTTP ${response.status}).`;
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

  useEffect(() => {
    const updateTime = () => {
      setSelectedDate(new Date());
    };
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const activeBriefing = briefings[0] || null;
  const historicBriefings = briefings.slice(1);

  const totalStoriesCount = activeBriefing?.cards?.length || 5;
  const unreadStories = (activeBriefing?.cards || []).filter(c => !readStoryIds.includes(c.id));
  const unreadCount = unreadStories.length;
  const readStoriesCount = totalStoriesCount - unreadCount;
  const estimatedSecondsRemaining = unreadCount === 0 ? 0 : Math.round(unreadCount * 11.6);

  useEffect(() => {
    if (activeBriefing?.cards?.length) {
      const hasActiveCard = activeBriefing.cards.some(c => c.id === activeCardId);
      if (!hasActiveCard) {
        setActiveCardId(activeBriefing.cards[0].id);
      }
    }
  }, [activeBriefing, activeCardId]);

  const handleMarkAsRead = async (cardId: string) => {
    const isCurrentlyRead = readStoryIds.includes(cardId);
    const nextReadState = !isCurrentlyRead;
    
    setReadStoryIds(prev => {
      if (isCurrentlyRead) {
        return prev.filter(id => id !== cardId);
      } else {
        return [...prev, cardId];
      }
    });

    // Persist to user_story_state database table
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

  const handleNextStory = (currentIndex: number) => {
    const cards = activeBriefing?.cards || [];
    if (cards[currentIndex]) {
      const currentId = cards[currentIndex].id;
      if (!readStoryIds.includes(currentId)) {
        handleMarkAsRead(currentId);
      }
    }
    const nextIndex = currentIndex + 1;
    if (nextIndex < cards.length) {
      const nextCard = cards[nextIndex];
      setActiveCardId(nextCard.id);
      const el = document.getElementById(`insight-card-${nextCard.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const topStory = activeBriefing?.cards?.[0] || null;
  const ordinaryUpdates = activeBriefing?.cards?.slice(1) || [];

  const getGreetingText = () => {
    const hours = selectedDate.getHours();
    if (hours < 12) return "Good morning.";
    if (hours < 18) return "Good afternoon.";
    return "Good evening.";
  };

  if (authLoading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 select-none transition-colors duration-200 ${
        theme === "dark" ? "bg-[#0b0f19] text-slate-100" : "bg-[#fcfdfd] text-[#111827]"
      }`}>
        <div className="flex flex-col items-center gap-6 max-w-sm text-center">
          <div className="relative flex items-center justify-center animate-pulse">
            <div className="absolute inset-0 bg-cyan-500/20 rounded-full filter blur-xl"></div>
            <RadarLogo size={80} theme={theme} />
          </div>
          <div className="space-y-2">
            <h2 className={`text-lg font-black tracking-widest uppercase ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}>
              NEWS RADAR
            </h2>
            <p className="text-[10px] text-cyan-400 font-extrabold uppercase tracking-widest">
              Initializing Intelligence Assistant...
            </p>
          </div>
          <RefreshCw size={16} className="text-cyan-400 animate-spin mt-2" />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex font-sans antialiased selection:bg-sky-500/30 transition-colors duration-200 ${
      theme === "dark" ? "bg-[#0b0f19] text-slate-100" : "bg-[#fcfdfd] text-[#111827]"
    }`}>
      
      {/* LEFT SIDEBAR Layout */}
      <aside className={`w-[260px] hidden lg:flex flex-col h-screen sticky top-0 shrink-0 border-r z-25 ${
        theme === "dark" 
          ? "bg-[#0c111d] border-slate-800/80 text-slate-300" 
          : "bg-[#f4f6f8] border-gray-200 text-gray-700"
      }`}>
        
        {/* Brand Header */}
        <div className={`p-6 flex items-center gap-3 border-b ${
          theme === "dark" ? "border-slate-800/80" : "border-gray-200"
        }`}>
          <RadarLogo size={36} theme={theme} />
          <div className="flex flex-col min-w-0">
            <span className={`font-black uppercase tracking-tight text-[15px] ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}>
              NEWS RADAR
            </span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-none">
              Intelligence Assistant
            </span>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
          <a 
            href="#briefing-top"
            onClick={() => setActiveTab("latest")}
            className={`flex items-center gap-3.5 px-4.5 py-3 rounded-xl text-xs font-bold transition ${
              activeTab === "latest"
                ? theme === "dark" 
                  ? "bg-[#161f36] text-white border border-slate-700/30" 
                  : "bg-white text-gray-900 shadow-sm border border-gray-250/50"
                : theme === "dark"
                  ? "text-slate-400 hover:bg-slate-800/40 hover:text-white"
                  : "text-gray-600 hover:bg-gray-100/70 hover:text-gray-900"
            }`}
          >
            <Zap size={15} className={activeTab === "latest" ? "text-cyan-400 shrink-0" : "text-gray-400 shrink-0"} />
            <span>Latest Briefing</span>
          </a>

          <a 
            href="#archives-section" 
            onClick={() => {
              setActiveTab("archives");
              const el = document.getElementById("archives-section");
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`flex items-center gap-3.5 px-4.5 py-3 rounded-xl text-xs font-bold transition ${
              activeTab === "archives"
                ? theme === "dark"
                  ? "bg-[#161f36] text-white border border-slate-700/30"
                  : "bg-white text-gray-900 shadow-sm border border-gray-250/50"
                : theme === "dark"
                  ? "text-slate-400 hover:bg-slate-800/40 hover:text-white"
                  : "text-gray-650 hover:bg-gray-105/70 hover:text-gray-900"
            }`}
          >
            <History size={15} className={activeTab === "archives" ? "text-cyan-405 shrink-0" : "text-gray-400 shrink-0"} />
            <span>Archives</span>
          </a>

          <button
            onClick={() => setShowPreferencesPanel(!showPreferencesPanel)}
            className={`w-full flex items-center gap-3.5 px-4.5 py-3 rounded-xl text-xs font-bold transition cursor-pointer text-left ${
              showPreferencesPanel
                ? theme === "dark"
                  ? "bg-[#161f36] text-cyan-400 border border-slate-700/30"
                  : "bg-white text-blue-600 shadow-sm border border-gray-250/50"
                : theme === "dark"
                  ? "text-slate-400 hover:bg-slate-800/40 hover:text-white"
                  : "text-gray-600 hover:bg-gray-100/70 hover:text-gray-900"
            }`}
          >
            <Settings size={15} className="shrink-0" />
            <span>Preferences</span>
          </button>
        </nav>

        {/* Profile Card bottom anchor block */}
        <div className={`p-4 border-t ${
          theme === "dark" ? "border-slate-800/80 bg-[#090d16]" : "border-gray-200 bg-white"
        }`}>
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 select-none ${
                theme === "dark" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "bg-blue-50 text-blue-700 border border-blue-100"
              }`}>
                <User size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <span className={`block font-bold text-xs truncate ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                  News Radar
                </span>
                <span className="block text-[9px] text-[#5C827D] font-medium truncate">
                  Stay informed without seeking information.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                type="button"
                className={`p-2 rounded-xl border cursor-pointer transition ${
                  theme === "dark" 
                    ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-yellow-300" 
                    : "bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-750"
                }`}
                title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {theme === "dark" ? <Sun size={12} /> : <Moon size={12} />}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* RIGHT/MAIN WORKSPACE AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* KEY MISSING API WARNING */}
        {isKeyError && (
          <div className="bg-red-600 text-white px-6 py-3 text-center text-xs font-bold flex items-center justify-center gap-2.5 shadow-md">
            <AlertTriangle size={15} className="shrink-0 animate-bounce" />
            <span>
              <strong>Gemini API Key Needed:</strong> Set your GEMINI_API_KEY environment variable.
            </span>
          </div>
        )}

        {/* MODERN HEADER BAR */}
        <header className={`sticky top-0 z-40 px-6 py-4 border-b backdrop-blur-md ${
          theme === "dark" 
            ? "bg-[#0b0f19]/80 border-slate-800/80 text-white" 
            : "bg-[#fcfdfd]/80 border-gray-200/60 text-[#111827]"
        }`}>
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            
            {/* Mobile Header Brand */}
            <div className="flex lg:hidden items-center gap-2">
              <RadarLogo size={24} theme={theme} />
              <span className="font-extrabold text-sm">NEWS RADAR</span>
            </div>

            <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-slate-400">
              <span>Stay informed without seeking information</span>
            </div>

            {/* Header Controls (Theme Toggle) */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                type="button"
                className={`p-2 rounded-full border cursor-pointer transition ${
                  theme === "dark" 
                    ? "bg-slate-800 border-slate-700 text-yellow-300 hover:bg-slate-700" 
                    : "bg-white border-gray-200 text-gray-700 shadow-sm hover:bg-gray-50"
                }`}
                title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              </button>
            </div>
          </div>
        </header>

        {/* WORKSPACE SCROLL BODY */}
        <main id="briefing-top" className="flex-1 overflow-y-auto">
          <div className="max-w-2xl w-full mx-auto px-6 py-8 flex flex-col gap-8">
            
            {/* Preferences Drawer */}
            <AnimatePresence>
              {showPreferencesPanel && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className={`border rounded-2xl p-6 shadow-sm space-y-6 ${
                    theme === "dark" ? "bg-[#101622] border-slate-800" : "bg-white border-gray-200"
                  }`}>
                    
                    <div className="flex items-center justify-between border-b pb-4 border-slate-800/30">
                      <div>
                        <h3 className={`font-bold text-base ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Briefing Preferences</h3>
                        <p className={`text-xs mt-0.5 ${theme === "dark" ? "text-slate-400" : "text-gray-500"}`}>
                          Choose what matters to you. News Radar will automatically find and prioritize the most relevant stories.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowPreferencesPanel(false)}
                        className={`p-1.5 rounded-lg text-gray-400 hover:text-white transition cursor-pointer`}
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Topics Selection */}
                    <div className="space-y-3">
                      <h4 className={`font-bold text-xs uppercase tracking-wider ${theme === "dark" ? "text-slate-300" : "text-gray-700"}`}>
                        Topics You Follow
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {availableTopics.map((topic) => {
                          const isSelected = preferences?.topics?.includes(topic.id);
                          
                          if (topic.comingSoon) {
                            return (
                              <div
                                key={topic.id}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium cursor-not-allowed select-none opacity-60 ${
                                  theme === "dark" ? "bg-slate-900/40 border-slate-800 text-slate-500" : "bg-gray-50 border-gray-200 text-gray-400"
                                }`}
                              >
                                <span>{topic.label}</span>
                                <span className={`text-[8px] font-bold px-1 rounded uppercase ${
                                  theme === "dark" ? "bg-slate-800 text-slate-400" : "bg-gray-200 text-gray-500"
                                }`}>Soon</span>
                              </div>
                            );
                          }

                          return (
                            <button
                              key={topic.id}
                              onClick={() => handleTopicToggle(topic.id)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold tracking-wide transition cursor-pointer ${
                                isSelected
                                  ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                                  : theme === "dark"
                                    ? "bg-slate-850 border-slate-700 text-slate-400 hover:text-white"
                                    : "bg-white hover:bg-gray-50 text-gray-600 border-gray-200"
                              }`}
                            >
                              <span>{topic.label}</span>
                              {isSelected && <Check size={11} className="stroke-[3]" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Briefing Frequency */}
                    <div className="space-y-3 pt-2 border-t border-slate-800/30">
                      <h4 className={`font-bold text-xs uppercase tracking-wider ${theme === "dark" ? "text-slate-300" : "text-gray-700"}`}>
                        Briefing Frequency
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { hours: 3, label: "Every 3 hours" },
                          { hours: 6, label: "Every 6 hours", recommended: true },
                          { hours: 12, label: "Every 12 hours" },
                          { hours: 24, label: "Once a day" }
                        ].map((item) => {
                          const isSelected = (preferences?.briefing_frequency_hours || 6) === item.hours;
                          return (
                            <button
                              key={item.hours}
                              onClick={() => handleFrequencyChange(item.hours)}
                              className={`relative p-3 rounded-xl border text-xs font-bold transition text-center cursor-pointer ${
                                isSelected
                                  ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                                  : theme === "dark"
                                    ? "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                                    : "bg-white hover:bg-gray-50 border-gray-200 text-gray-700"
                              }`}
                            >
                              <div>{item.label}</div>
                              {item.recommended && (
                                <span className={`block text-[8px] font-black uppercase mt-1 tracking-wider ${
                                  isSelected ? "text-blue-100" : "text-cyan-400"
                                }`}>
                                  Recommended
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => setShowPreferencesPanel(false)}
                        className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                      >
                        Save Preferences
                      </button>
                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* GREETING HEADER */}
            <div className="space-y-1">
              <h1 className={`text-3xl md:text-4xl font-extrabold tracking-tight leading-none ${
                theme === "dark" ? "text-white" : "text-[#111827]"
              }`}>
                {getGreetingText()}
              </h1>
              <p className={`text-base md:text-lg font-bold tracking-tight ${
                theme === "dark" ? "text-slate-400" : "text-gray-550"
              }`}>
                Here are the <span className={theme === "dark" ? "text-cyan-400" : "text-blue-600"}>{totalStoriesCount}</span> important updates since your last brief.
              </p>
            </div>

            {/* Briefing Status Bar */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-4.5 rounded-2xl gap-3 ${
              theme === "dark" ? "bg-[#111725] border border-slate-800/80" : "bg-blue-50/50 border border-blue-100"
            }`}>
              <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                  theme === "dark" ? "bg-cyan-500/10 text-cyan-400" : "bg-blue-100 text-blue-700"
                }`}>
                  <Sparkles size={14} className="animate-spin-slow" />
                </div>
                <div>
                  <span className={`block text-xs font-extrabold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                    Your briefing is ready.
                  </span>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                    <span className={`font-bold ${theme === "dark" ? "text-cyan-400" : "text-blue-600"}`}>
                      Progress: {readStoriesCount} of {totalStoriesCount} read
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className={`font-bold ${theme === "dark" ? "text-slate-400" : "text-gray-500"}`}>
                      ~{estimatedSecondsRemaining > 0 ? `${estimatedSecondsRemaining} sec remaining` : "Finished"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleRefreshBriefing}
                disabled={loadingRadar}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shrink-0 ${
                  theme === "dark"
                    ? "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                }`}
              >
                <RefreshCw size={12} className={loadingRadar ? "animate-spin" : ""} />
                <span>{loadingRadar ? "Refreshing Briefing..." : "Refresh Briefing"}</span>
              </button>
            </div>

            {/* How We Built Your Briefing (Transparency Section) */}
            <div className={`border rounded-2xl p-4.5 shadow-sm ${
              theme === "dark" ? "bg-[#111624] border-slate-800/80" : "bg-white border-gray-200"
            }`}>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                <span>HOW WE BUILT YOUR BRIEFING</span>
              </div>
              <div className={`grid grid-cols-4 divide-x text-center ${
                theme === "dark" ? "divide-slate-800/60" : "divide-gray-100"
              }`}>
                <div className="px-1">
                  <span className={`block text-xl font-extrabold tracking-tight leading-none ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}>
                    127
                  </span>
                  <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wide mt-1">
                    Articles Analyzed
                  </span>
                </div>
                <div className="px-1">
                  <span className="block text-xl font-extrabold tracking-tight leading-none text-cyan-400">
                    42
                  </span>
                  <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wide mt-1">
                    Stories Clustered
                  </span>
                </div>
                <div className="px-1">
                  <span className={`block text-xl font-extrabold tracking-tight leading-none ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}>
                    {activeBriefing?.cards?.length || 5}
                  </span>
                  <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wide mt-1">
                    Insights Selected
                  </span>
                </div>
                <div className="px-1">
                  <span className={`block text-xl font-extrabold tracking-tight leading-none ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}>
                    ~58s
                  </span>
                  <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wide mt-1">
                    Reading Time
                  </span>
                </div>
              </div>
            </div>

            {/* Briefing Outline / Queue */}
            {activeBriefing && activeBriefing.cards && activeBriefing.cards.length > 0 && (
              <div className={`border rounded-2xl p-5 shadow-sm space-y-3 ${
                theme === "dark" ? "bg-[#111624] border-slate-800/80" : "bg-white border-gray-200"
              }`}>
                <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b pb-2 border-slate-800/30">
                  <span>STORY QUEUE</span>
                  <span className="font-mono text-slate-500">
                    {Math.round((readStoriesCount / totalStoriesCount) * 100)}% READ
                  </span>
                </div>

                <div className="space-y-1.5">
                  {activeBriefing.cards.map((card, idx) => {
                    const isRead = readStoryIds.includes(card.id);
                    const isActive = activeCardId === card.id;
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => {
                          setActiveCardId(card.id);
                          const el = document.getElementById(`insight-card-${card.id}`);
                          if (el) {
                            el.scrollIntoView({ behavior: "smooth", block: "center" });
                          }
                        }}
                        className={`w-full flex items-center justify-between text-left px-3 py-2 rounded-xl border transition-all text-xs cursor-pointer ${
                          isActive
                            ? theme === "dark"
                              ? "bg-slate-800/80 border-cyan-500/60 text-white font-bold"
                              : "bg-blue-50 border-blue-400 text-blue-900 font-bold"
                            : theme === "dark"
                              ? "bg-[#111623]/40 border-slate-850 text-slate-350 hover:bg-slate-900/60"
                              : "bg-gray-50/50 border-gray-100 text-gray-700 hover:bg-gray-100/55"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-gray-400 font-mono text-[10px] shrink-0 font-bold">
                            {idx + 1}.
                          </span>
                          <span className="truncate pr-2 font-medium">{card.headline}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          {isRead ? (
                            <CheckCircle2 size={14} className={theme === "dark" ? "text-cyan-400" : "text-blue-600"} />
                          ) : (
                            <span className={`h-2 w-2 rounded-full shrink-0 ${
                              isActive ? "bg-cyan-400 animate-pulse" : "bg-gray-300 dark:bg-slate-700"
                            }`}></span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Briefing Completion Card */}
            {unreadCount === 0 && totalStoriesCount > 0 && (
              <motion.div
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`border rounded-2xl p-8 text-center space-y-6 ${
                  theme === "dark" 
                    ? "bg-gradient-to-br from-[#10192e] to-[#0d1323] border-emerald-500/30 shadow-lg" 
                    : "bg-gradient-to-br from-emerald-50/40 to-white border-emerald-200 shadow-sm"
                }`}
              >
                <div className="flex flex-col items-center">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center mb-3 ${
                    theme === "dark" ? "bg-emerald-500/10 text-emerald-400 animate-bounce" : "bg-emerald-100 text-emerald-750 animate-bounce"
                  }`}>
                    <Check size={24} className="stroke-[3]" />
                  </div>
                  <h2 className={`text-2xl font-black tracking-tight ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                    Briefing Complete
                  </h2>
                  <p className={`text-xs max-w-md mt-1 ${theme === "dark" ? "text-slate-400" : "text-gray-500"}`}>
                    You reviewed all {totalStoriesCount} important updates in today&apos;s intelligence brief.
                  </p>
                </div>

                <div className={`grid grid-cols-3 gap-3 p-4 rounded-xl text-center border ${
                  theme === "dark" ? "bg-slate-900/60 border-slate-800" : "bg-gray-50/50 border-gray-150"
                }`}>
                  <div className="space-y-0.5">
                    <span className="block text-[9px] font-bold text-gray-400 uppercase">Updates Reviewed</span>
                    <span className={`block text-sm font-extrabold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                      {totalStoriesCount}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="block text-[9px] font-bold text-gray-400 uppercase">Est. Read Time</span>
                    <span className={`block text-sm font-extrabold ${theme === "dark" ? "text-cyan-400" : "text-blue-650"}`}>
                      47 seconds
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="block text-[9px] font-bold text-gray-400 uppercase">Next Briefing</span>
                    <span className={`block text-sm font-extrabold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                      6:00 PM
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      setActiveTab("archives");
                      const el = document.getElementById("archives-section");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <span>Browse Archive</span>
                    <ArrowRight size={13} />
                  </button>
                  <button
                    onClick={() => setReadStoryIds([])}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                      theme === "dark"
                        ? "bg-slate-800/50 border-slate-700 hover:bg-slate-800 text-slate-300"
                        : "bg-white border-gray-200 hover:bg-gray-50 text-gray-755"
                    }`}
                  >
                    Reset Progress
                  </button>
                </div>
              </motion.div>
            )}

            {/* Error alerts */}
            {radarError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-xs text-red-400 flex items-start gap-3">
                <AlertTriangle size={15} className="shrink-0 mt-0.5 text-red-400" />
                <div>
                  <p className="font-extrabold">Briefing Generation Issue</p>
                  <p className="text-red-300 font-medium mt-0.5">{radarError}</p>
                </div>
              </div>
            )}

            {/* 🔥 TOP STORY */}
            {topStory ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs uppercase font-extrabold tracking-widest text-slate-400 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500"></span>
                    <span>TOP STORY</span>
                  </h2>
                </div>
                
                <InsightCard
                  card={topStory}
                  isTopStory={true}
                  theme={theme}
                  isRead={readStoryIds.includes(topStory.id)}
                  onMarkAsRead={() => handleMarkAsRead(topStory.id)}
                  onNextStory={() => handleNextStory(0)}
                  hasNextStory={activeBriefing!.cards.length > 1}
                  isActive={activeCardId === topStory.id}
                />
              </div>
            ) : (
              <div className={`border border-dashed rounded-2xl p-12 text-center ${
                theme === "dark" ? "bg-[#111725] border-slate-800" : "bg-white border-gray-200"
              }`}>
                <Sparkles className="text-gray-400 mx-auto mb-3" size={24} />
                <p className="text-sm font-semibold mb-1 text-slate-300">Your briefing is empty</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Click &ldquo;Refresh Briefing&rdquo; to analyze technology updates.
                </p>
              </div>
            )}

            {/* OTHER STORIES */}
            {ordinaryUpdates.length > 0 && (
              <div className="space-y-5">
                <h2 className="text-xs uppercase font-extrabold tracking-widest text-slate-400 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-400"></span>
                  <span>MORE STORIES</span>
                </h2>
                
                <div className="grid grid-cols-1 gap-5">
                  {ordinaryUpdates.map((card, index) => {
                    const cardIndex = index + 1;
                    return (
                      <InsightCard
                        key={card.id}
                        card={card}
                        isTopStory={false}
                        theme={theme}
                        isRead={readStoryIds.includes(card.id)}
                        onMarkAsRead={() => handleMarkAsRead(card.id)}
                        onNextStory={() => handleNextStory(cardIndex)}
                        hasNextStory={cardIndex < (activeBriefing?.cards?.length || 0) - 1}
                        isActive={activeCardId === card.id}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* PREVIOUS BRIEFINGS HISTORY */}
            <div id="archives-section" className="space-y-6 pt-8 border-t border-slate-800/40">
              <div>
                <h2 className={`text-lg font-bold tracking-tight mb-1 flex items-center gap-2.5 ${
                  theme === "dark" ? "text-white" : "text-[#111827]"
                }`}>
                  <History size={18} className="text-slate-400 shrink-0" />
                  <span>Previous Briefings</span>
                </h2>
                <p className="text-xs text-slate-500">Your personal intelligence briefing archive.</p>
              </div>

              <div className="space-y-4">
                {historicBriefings.map((brief, idx) => (
                  <div key={brief.id} className={`border rounded-2xl p-5 shadow-sm space-y-3 ${
                    theme === "dark" ? "bg-[#111624] border-slate-800/80" : "bg-white border-gray-200"
                  }`}>
                    <div className="flex items-center justify-between text-xs text-gray-400 border-b pb-2.5 border-slate-800/30">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${theme === "dark" ? "text-slate-200" : "text-gray-800"}`}>
                          Briefing Digest #{historicBriefings.length - idx}
                        </span>
                        <span className="text-gray-600">•</span>
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[9px] uppercase tracking-wider ${
                          theme === "dark" ? "bg-slate-800 text-slate-350" : "bg-gray-100 text-gray-600"
                        }`}>{brief.cards?.length || 0} Stories</span>
                      </div>
                      <span className="font-semibold text-gray-500">
                        {new Date(brief.generated_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {brief.cards?.map((card) => (
                        <div key={card.id} className="text-xs">
                          <h4 className={`font-bold ${
                            theme === "dark" ? "text-slate-200" : "text-gray-800"
                          }`}>{card.headline}</h4>
                          <p className={`leading-relaxed mt-1 text-[11px] ${
                            theme === "dark" ? "text-slate-400" : "text-gray-500"
                          }`}>{card.summary}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {historicBriefings.length === 0 && (
                  <div className={`p-8 border border-dashed rounded-2xl text-center text-xs italic ${
                    theme === "dark" ? "bg-slate-900/40 border-slate-800 text-slate-500" : "bg-gray-50/50 border-gray-200 text-gray-400"
                  }`}>
                    No previous briefings stored yet.
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* FOOTER */}
          <footer className={`py-10 mt-12 text-center text-xs border-t ${
            theme === "dark" ? "border-slate-800/60 bg-[#090b13] text-slate-400" : "bg-gray-50 border-gray-200 text-gray-500"
          }`}>
            <div className="max-w-2xl mx-auto px-6 space-y-2">
              <p className="font-bold tracking-widest text-[#5C827D] text-[10px] uppercase">
                News Radar AI Assistant
              </p>
              <p className="text-[11px] font-medium opacity-70">
                Stay informed without seeking information.
              </p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
