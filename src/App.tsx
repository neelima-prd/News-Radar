/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import {
  Sparkles,
  RefreshCw,
  Sliders,
  History,
  MessageSquare,
  Globe,
  Bell,
  BellOff,
  User,
  Radio,
  Plus,
  Trash2,
  ListFilter,
  Check,
  AlertTriangle,
  Flame,
  CornerDownRight,
  TrendingUp,
  Briefcase
} from "lucide-react";
import { Briefing, UserPreferences, LiveRadarLog } from "./types";
import { InsightCard } from "./components/InsightCard";
import { LiveRadarLogs } from "./components/LiveRadarLogs";
import { AnalyticsPanel } from "./components/AnalyticsPanel";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"current" | "archive" | "preferences" | "feedback">("current");
  
  // App state
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loadingRadar, setLoadingRadar] = useState(false);
  const [radarError, setRadarError] = useState<string | null>(null);
  const [isKeyError, setIsKeyError] = useState(false);
  const [pollingTrigger, setPollingTrigger] = useState(0);
  
  // Local active filters
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("All");

  // Auth Simulation
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const userEmail = "neelimaneel3@gmail.com";

  // Notifications Toggle
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default"
  );
  
  // Custom Feed Input state
  const [newFeedUrl, setNewFeedUrl] = useState("");

  const loadData = async () => {
    try {
      // Load briefings
      const briefingsRes = await fetch("/api/briefings");
      if (briefingsRes.ok) {
        const briefs = await briefingsRes.json();
        setBriefings(briefs);
      }

      // Load user preferences
      const prefRes = await fetch("/api/preferences");
      if (prefRes.ok) {
        const prefs = await prefRes.json();
        setPreferences(prefs);
      }
    } catch (e) {
      console.error("Critical error fetching system state", e);
    }
  };

  useEffect(() => {
    loadData();
    
    // Register initialization analytics event
    triggerAnalytics("session_started", { 
      device_width: typeof window !== "undefined" ? window.innerWidth : 1024,
      timestamp: new Date().toISOString()
    });
  }, []);

  const triggerAnalytics = async (event_name: string, metadata: Record<string, any>) => {
    try {
      await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_name, metadata })
      });
      setPollingTrigger(prev => prev + 1); // Ping analytics widget lists
    } catch (_) {}
  };

  // HTML5 push notification permission requester
  const handleToggleNotifications = async () => {
    if (!("Notification" in window)) {
      alert("This browser model does not support native notifications.");
      return;
    }
    
    if (Notification.permission === "granted") {
      // Just toggle mock representation or log
      triggerAnalytics("notifications_disabled", { previous_status: "granted" });
      setNotificationPermission("default");
    } else {
      const resp = await Notification.requestPermission();
      setNotificationPermission(resp);
      triggerAnalytics("notifications_permission_updated", { status: resp });
      
      if (resp === "granted") {
        new Notification("News Radar Enabled", {
          body: "You will be alerted instantly when new intelligence sweeps complete.",
          icon: "/favicon.ico"
        });
      }
    }
  };

  // RSS add feeds helper
  const handleAddFeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedUrl.trim() || !preferences) return;
    
    try {
      // Validate structure basic url
      new URL(newFeedUrl);
      
      const updatedFeeds = [...(preferences.custom_feeds || []), newFeedUrl.trim()];
      handleSavePreferences({
        ...preferences,
        custom_feeds: updatedFeeds
      });
      setNewFeedUrl("");
    } catch (_) {
      alert("Please provide a valid web URL beginning with http:// or https://");
    }
  };

  const handleRemoveFeed = (feedUrl: string) => {
    if (!preferences) return;
    const filtered = (preferences.custom_feeds || []).filter(f => f !== feedUrl);
    handleSavePreferences({
      ...preferences,
      custom_feeds: filtered
    });
  };

  const handleCategoryPreferenceToggle = (category: string) => {
    if (!preferences) return;
    let updatedCats = [...preferences.categories];
    if (updatedCats.includes(category)) {
      updatedCats = updatedCats.filter(c => c !== category);
    } else {
      updatedCats.push(category);
    }
    handleSavePreferences({
      ...preferences,
      categories: updatedCats
    });
  };

  const handleFrequencyChange = (freq: "hourly" | "daily" | "weekly") => {
    if (!preferences) return;
    handleSavePreferences({
      ...preferences,
      frequency: freq
    });
  };

  const handleSavePreferences = async (updated: UserPreferences) => {
    try {
      const response = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
        setPollingTrigger(prev => prev + 1);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Perform dynamic AI aggregation scan
  const handleTriggerRadarSweep = async () => {
    if (loadingRadar) return;
    
    setLoadingRadar(true);
    setRadarError(null);
    setIsKeyError(false);
    
    triggerAnalytics("radar_sweep_started", {
      custom_feed_count: preferences?.custom_feeds.length || 0,
      subscribed_categories: preferences?.categories || []
    });

    try {
      const response = await fetch("/api/briefings/generate", {
        method: "POST"
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (data.isKeyError) {
          setIsKeyError(true);
        }
        throw new Error(data.error || "System Sweep error. Verify log telemetry.");
      }
      
      // Successfully sweep completed
      await loadData();
      setActiveTab("current");
      setPollingTrigger(prev => prev + 1);

      // Trigger standard browser Notification if permission is granted
      if (Notification.permission === "granted") {
        const topHeadline = data.cards?.[0]?.headline || "Intelligence Brief Available";
        new Notification("News Radar: Sweep Completed", {
          body: `Brief: ${topHeadline.substring(0, 70)}...`,
          tag: "radar-update"
        });
      }
    } catch (err: any) {
      setRadarError(err.message || "Sweep failed.");
      triggerAnalytics("radar_sweep_failed", { reason: err.message });
    } finally {
      setLoadingRadar(false);
    }
  };

  // Real-time Date & Time state for Bento Grid header
  const [timeState, setTimeState] = useState({
    dateStr: "August 15, 2024",
    timeStr: "09:42 AM GMT"
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };
      const dateString = now.toLocaleDateString("en-US", options);
      const timeString = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZoneName: "short"
      });
      setTimeState({
        dateStr: dateString,
        timeStr: timeString
      });
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const allAvailableCategories = ["AI & ML", "Startups & VC", "Biotech", "Fintech", "Green Tech", "Hardware", "SaaS"];

  const activeBriefing = briefings[0] || null;
  const historicBriefings = briefings.slice(1);

  // Filters cards of active briefing based on filter choice
  const filteredCards = activeBriefing
    ? activeBriefing.cards.filter(c => selectedCategoryFilter === "All" || c.category === selectedCategoryFilter)
    : [];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans antialiased radar-grid select-none">
      
      {/* Dynamic Key Missing Sticky Notification */}
      {isKeyError && (
        <div className="bg-rose-600 text-white px-4 py-2.5 text-center text-xs font-mono flex items-center justify-center gap-2 shadow-sm">
          <AlertTriangle size={14} className="shrink-0" />
          <span>
            <strong>Gemini API Key Required:</strong> To synthesize summaries and deduct clusters, write your real API key in the <strong>Settings &gt; Secrets</strong> tab of Google AI Studio.
          </span>
        </div>
      )}

      {/* Primary Header section - Bento styling */}
      <header className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-slate-200/80 z-40 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo & Vision tagline */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white relative overflow-hidden transition-transform hover:scale-105">
              <Radio size={20} className="animate-pulse" />
              <div className="absolute inset-0 border border-white/20 rounded-xl"></div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-xl text-slate-800 tracking-tight leading-none">News Radar</span>
                <span className="text-[9px] font-mono font-bold bg-blue-50 border border-blue-100 text-blue-700 px-1.5 py-0.5 rounded-md">MVPv1</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">Stay informed without seeking information.</p>
            </div>
          </div>

          {/* User & Options Toolbar with dynamic bento time block */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-4">
            
            {/* HTML5 notifications center toggle */}
            <button
              onClick={handleToggleNotifications}
              title={notificationPermission === "granted" ? "Web Notifications Active" : "Click to authorize HTML5 browser notifications"}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-mono transition-all cursor-pointer ${
                notificationPermission === "granted"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700 font-bold shadow-sm"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              {notificationPermission === "granted" ? <Bell size={12} className="animate-bounce text-emerald-600" /> : <BellOff size={11} />}
              <span>{notificationPermission === "granted" ? "Alerts On" : "Enable Alerts"}</span>
            </button>

            {/* Google Authentication Account presentation */}
            <div className="flex items-center gap-2.5 bg-white border border-slate-200 pl-2.5 pr-3 py-1.5 rounded-full shadow-sm text-xs">
              <div className="h-5.5 w-5.5 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0 text-slate-600">
                <User size={11} />
              </div>
              <div className="text-left font-mono leading-none">
                <span className="block text-[8px] text-slate-400 uppercase tracking-widest leading-none mb-0.5">User Role</span>
                <span className="block text-[10px] text-slate-700 font-medium">{userEmail}</span>
              </div>
            </div>

            {/* Live Bento Clock */}
            <div className="text-center sm:text-right border-l border-slate-200 pl-4 hidden md:block">
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider leading-none mb-1">{timeState.dateStr}</p>
              <p className="text-xs font-semibold text-slate-700 leading-none">{timeState.timeStr}</p>
            </div>

          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Main view workspace (7 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
          
          {/* Section Navigation Tabs bar - Bento styled capsules */}
          <div className="flex flex-wrap items-center bg-slate-100 p-1.5 rounded-2xl gap-1">
            <button
              onClick={() => { setActiveTab("current"); triggerAnalytics("tab_switched", { tab: "current" }); }}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === "current"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
              }`}
            >
              <Sparkles size={13} />
              <span>Current Briefing</span>
            </button>
            <button
              onClick={() => { setActiveTab("archive"); triggerAnalytics("tab_switched", { tab: "archive" }); }}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === "archive"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
              }`}
            >
              <History size={13} />
              <span>History Archive</span>
              {historicBriefings.length > 0 && (
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[9px] font-bold">
                  {historicBriefings.length}
                </span>
              )}
            </button>
            <button
              onClick={() => { setActiveTab("preferences"); triggerAnalytics("tab_switched", { tab: "preferences" }); }}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === "preferences"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
              }`}
            >
              <Sliders size={13} />
              <span>Preferences & Feeds</span>
            </button>
          </div>

          {/* ACTIVE CONTENT SHEET */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              
              {/* TAB 1: Current Briefing workspace */}
              {activeTab === "current" && (
                <motion.div
                  key="current-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-5"
                >
                  
                  {/* Brief metadata block - Bento custom shell */}
                  {activeBriefing && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border border-slate-200 bg-white rounded-3xl p-5 shadow-sm text-xs gap-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp size={15} className="text-blue-600 shrink-0" />
                        <span className="font-mono text-[11px] text-slate-500">
                          Sweep Complete:{" "}
                          <strong className="text-slate-800 font-sans">
                            {new Date(activeBriefing.generated_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </strong>
                        </span>
                      </div>
                      
                      {/* Sub-category Quick Filters - Pill buttons */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 mr-1 flex items-center gap-0.5">
                          <ListFilter size={11} /> Filter:
                        </span>
                        {["All", ...Array.from(new Set(activeBriefing.cards.map(c => c.category)))].map(cat => (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategoryFilter(cat)}
                            className={`px-3 py-1 rounded-full text-[10px] font-mono transition-all cursor-pointer ${
                              selectedCategoryFilter === cat
                                ? "bg-blue-600 text-white font-bold shadow-sm"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* List of generated cards */}
                  <div className="space-y-4">
                    {activeBriefing ? (
                      filteredCards.length > 0 ? (
                        filteredCards.map((card) => (
                          <InsightCard
                            key={card.id}
                            card={card}
                            onFeedbackSubmitted={() => setPollingTrigger(prev => prev + 1)}
                          />
                        ))
                      ) : (
                        <div className="border border-slate-200 border-dashed rounded-3xl p-10 bg-white text-center text-slate-500 flex flex-col items-center justify-center">
                          <Sliders className="text-slate-400 mb-3" size={28} />
                          <h4 className="font-semibold text-slate-700 mb-1">No Insight Cards Matching filter</h4>
                          <p className="text-xs text-slate-400 max-w-sm">No synthesized briefings exist under the category preference &ldquo;{selectedCategoryFilter}&rdquo;. Try another filter or trigger a fresh dynamic sweep.</p>
                        </div>
                      )
                    ) : (
                      <div className="border border-slate-205 bg-white rounded-3xl p-10 shadow-sm text-center">
                        <div className="h-14 w-14 bg-blue-50 border border-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                          <Sparkles size={24} />
                        </div>
                        <h3 className="font-display font-bold text-slate-800 text-lg mb-1.5">Your Radar is Quiet</h3>
                        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed mb-6">
                          No technology intelligence briefs have been harvested yet today. Sync with the satellite and cluster feeds now.
                        </p>
                        <button
                          onClick={handleTriggerRadarSweep}
                          disabled={loadingRadar}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-full text-xs font-mono font-bold transition inline-flex items-center gap-2 cursor-pointer shadow-md"
                        >
                          <RefreshCw size={13} className={loadingRadar ? "animate-spin" : ""} />
                          Trigger Sweep
                        </button>
                      </div>
                    )}
                  </div>

                </motion.div>
              )}

              {/* TAB 2: Historical listings archive */}
              {activeTab === "archive" && (
                <motion.div
                  key="archive-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-5"
                >
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <h3 className="font-bold text-base mb-1.5 flex items-center gap-1.5 text-slate-800">
                      <History size={16} className="text-blue-600" />
                      Historical Briefing Archiver
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Retrieve detailed brief files from compiled news runs processed over previous days. Features complete preservation of original deduplicated sources.
                    </p>
                  </div>

                  {historicBriefings.length === 0 ? (
                    <div className="border border-slate-200 border-dashed rounded-3xl p-12 bg-slate-50/50 text-center text-slate-400 flex flex-col items-center justify-center">
                      <History className="text-slate-300 mb-2" size={32} />
                      <p className="text-xs italic">Historical intelligence bin is empty. Older scans will automatically appear here once new briefs generate.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {historicBriefings.map((brief, bIdx) => (
                        <div key={brief.id} className="border border-slate-205 rounded-3xl bg-white p-6 shadow-sm space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                                Archive BRIEF #{historicBriefings.length - bIdx}
                              </span>
                              <span className="text-xs text-slate-400 font-mono">
                                {new Date(brief.generated_at).toLocaleString()}
                              </span>
                            </div>
                            <span className="text-[10px] text-emerald-600 font-mono font-bold flex items-center gap-1">
                              <Check size={11} className="stroke-[3]" /> PERSISTED
                            </span>
                          </div>

                          <div className="space-y-4">
                            {brief.cards.map((card) => (
                              <div key={card.id} className="border-l-[2.5px] border-blue-500 pl-4 py-1">
                                <h4 className="text-xs font-semibold text-slate-800 mb-1">{card.headline}</h4>
                                <p className="text-[11px] text-slate-500 leading-relaxed mb-1.5">{card.summary}</p>
                                <div className="text-[10px] font-mono text-blue-700 bg-blue-50/60 max-w-max px-2 py-1 rounded-md leading-none">
                                  Why It Matters: <span className="text-slate-600 font-sans">{card.why_it_matters}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </motion.div>
              )}

              {/* TAB 3: Preferences Config workspace */}
              {activeTab === "preferences" && (
                <motion.div
                  key="preferences-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  
                  {/* Part A: Category list subscription */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                    <div>
                      <h3 className="font-display font-bold text-slate-800 text-sm mb-1">Subscribed Topic Segments</h3>
                      <p className="text-xs text-slate-500">Pick which vertical intelligence channels the dynamic algorithms prioritize in the calculated score formula.</p>
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                      {allAvailableCategories.map((cat) => {
                        const active = preferences?.categories.includes(cat);
                        return (
                          <button
                            key={cat}
                            onClick={() => handleCategoryPreferenceToggle(cat)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-xs font-semibold transition cursor-pointer ${
                              active 
                                ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 font-bold shadow-sm" 
                                : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                            }`}
                          >
                            <span>{cat}</span>
                            {active && <Check size={11} className="stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Part B: Scraper feed manager */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                    <div>
                      <h3 className="font-display font-bold text-slate-800 text-sm mb-1">Custom News Feed Satellites</h3>
                      <p className="text-xs text-slate-500">Define your custom technology XML URLs or RSS feeds. Our scraper aggregates, parses, clusters, and synthesizes these feeds into high-value bulletins.</p>
                    </div>

                    {/* Ingestion feed form */}
                    <form onSubmit={handleAddFeed} className="flex gap-2">
                      <input
                        type="url"
                        required
                        placeholder="https://example-feed-domain.com/rss"
                        value={newFeedUrl}
                        onChange={(e) => setNewFeedUrl(e.target.value)}
                        className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer transition flex items-center gap-1.5 shrink-0 shadow-sm"
                      >
                        <Plus size={14} /> Add Feed
                      </button>
                    </form>

                    {/* Integrated lists */}
                    <div className="space-y-2 border-t border-slate-100 pt-3">
                      <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 block mb-2">Registered Satellite Scrapers</span>
                      
                      {preferences?.custom_feeds.map((feed) => (
                        <div key={feed} className="flex items-center justify-between border border-slate-200 rounded-xl p-3 bg-slate-50 text-xs font-mono">
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <Globe size={13} className="text-slate-400 shrink-0" />
                            <span className="text-slate-700 font-semibold truncate select-all">{feed}</span>
                          </div>
                          <button
                            onClick={() => handleRemoveFeed(feed)}
                            title="Deactivate Feed"
                            className="text-slate-400 hover:text-rose-500 transition cursor-pointer p-1.5 rounded-lg hover:bg-slate-150"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}

                      {(!preferences || preferences.custom_feeds.length === 0) && (
                        <div className="text-slate-400 italic text-xs py-2">No custom RSS feeds configured. System falls back onto Hacker News and TechCrunch feeds by default.</div>
                      )}
                    </div>
                  </div>

                  {/* Part C: Ingestion schedules */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                    <div>
                      <h3 className="font-display font-bold text-slate-800 text-sm mb-1">Automatic briefing schedule</h3>
                      <p className="text-xs text-slate-500">Pick how frequently News Radar automatically trigger AI clustering sweeps to compile fresh briefing bulletins.</p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {(["hourly", "daily", "weekly"] as const).map((freq) => {
                        const active = preferences?.frequency === freq;
                        return (
                          <button
                            key={freq}
                            onClick={() => handleFrequencyChange(freq)}
                            className={`px-4 py-3 rounded-xl border text-xs font-mono uppercase tracking-wider font-bold transition cursor-pointer ${
                              active
                                ? "bg-blue-600 border-blue-600 text-white font-bold shadow-sm"
                                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600"
                            }`}
                          >
                            {freq}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </motion.div>
              )}

            </AnimatePresence>
          </div>

        </div>

        {/* RIGHT COLUMN: Control station & monitors (5 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
          
          {/* CONTROL BLOCK 1: Circle animated CSS Radar Sweep */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col items-center text-white">
            
            {/* Visual satellite circular sweep grid */}
            <div className="relative h-44 w-44 rounded-full border border-blue-500/20 flex items-center justify-center bg-slate-950/80 shadow-inner mb-5 overflow-hidden">
              
              {/* Spinning sweep line */}
              <div className={`absolute inset-0 radar-sweep rounded-full ${loadingRadar ? "duration-1000" : "duration-[4s]"}`}>
                <div className="absolute top-0 left-1/2 right-0 bottom-1/2 bg-gradient-to-tr from-blue-500/30 to-transparent origin-bottom-left transform -rotate-45"></div>
                <div className="absolute top-0 bottom-1/2 left-1/2 w-0.5 bg-blue-400/80 transform origin-bottom-center"></div>
              </div>

              {/* Concentric rings */}
              <div className="absolute h-32 w-32 rounded-full border border-blue-500/10"></div>
              <div className="absolute h-20 w-20 rounded-full border border-blue-500/5"></div>
              
              {/* Horizontal / Vertical crosshairs */}
              <div className="absolute h-full w-px bg-blue-500/10"></div>
              <div className="absolute w-full h-px bg-blue-500/10"></div>

              {/* Simulated blinking radar targets */}
              <span className="absolute top-10 left-12 h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping"></span>
              <span className="absolute top-24 right-14 h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping"></span>
              <span className="absolute bottom-12 left-16 h-1 w-1 rounded-full bg-blue-500/80 animate-ping"></span>
              
              {/* Real-time status tag centerness */}
              <div className="z-10 bg-slate-950/95 backdrop-blur-sm border border-slate-850 rounded-lg px-2 py-0.5 text-[9px] font-mono font-bold tracking-widest text-blue-400">
                {loadingRadar ? "SWEEPING" : "STANDBY"}
              </div>
            </div>

            {/* Sweep Trigger controls button */}
            <div className="w-full space-y-4">
              <div className="text-center">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-1">Automated Intelligence briefing</span>
                <span className="text-slate-200 font-mono font-semibold text-xs flex items-center justify-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${loadingRadar ? "bg-blue-400 animate-pulse" : "bg-slate-500"}`}></span> 
                  {loadingRadar ? "Synthesizing News Briefing..." : "Status: Satellites Online"}
                </span>
              </div>

              <button
                onClick={handleTriggerRadarSweep}
                disabled={loadingRadar}
                className={`w-full py-3 rounded-full text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md ${
                  loadingRadar
                    ? "bg-slate-800 border border-slate-700 text-slate-400"
                    : "bg-blue-600 hover:bg-blue-500 border border-blue-700 text-white hover:shadow-lg active:scale-98"
                }`}
              >
                <RefreshCw size={13} className={loadingRadar ? "animate-spin" : ""} />
                <span>Trigger Radar Sweep</span>
              </button>

              {radarError && (
                <div className="bg-rose-950/40 border border-rose-900 rounded-xl p-3 text-[10px] font-mono text-rose-300 leading-normal">
                  <div className="flex gap-1.5 items-start">
                    <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                    <span>{radarError}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CONTROL BLOCK 2: Live Scanning telemetry Log terminal */}
          <LiveRadarLogs pollingTrigger={pollingTrigger} />

          {/* CONTROL BLOCK 3: PostHog event payload audit logs */}
          <AnalyticsPanel pollingTrigger={pollingTrigger} />

        </div>

      </main>

      {/* Bento Bottom Ticker Footer */}
      <footer className="mt-8 max-w-7xl w-[calc(100%-3rem)] mx-auto h-12 bg-white border border-slate-200 rounded-2xl flex items-center px-4 gap-4 overflow-hidden mb-8 shadow-sm">
        <span className="text-[10px] font-extrabold text-red-500 uppercase animate-pulse flex items-center gap-1 shrink-0">
          <span className="h-2 w-2 bg-red-500 rounded-full inline-block"></span>
          Breaking:
        </span>
        <div className="flex-1 overflow-hidden relative">
          <div className="animate-marquee whitespace-nowrap text-xs font-medium text-slate-650 italic leading-none flex gap-16">
            <span>Major central banks signal coordinated policy shift regarding digital currencies • Tesla announces partnership with autonomous transit agency in Zurich • Global semiconductor shortage projected to end by Q4 2024 • NASA's James Webb Telescope discovers new water signs on exoplanet K2-18b...</span>
            <span>Major central banks signal coordinated policy shift regarding digital currencies • Tesla announces partnership with autonomous transit agency in Zurich • Global semiconductor shortage projected to end by Q4 2024 • NASA's James Webb Telescope discovers new water signs on exoplanet K2-18b...</span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-2.5 py-1 shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></div>
          <span className="text-[9px] font-bold text-blue-700 uppercase leading-none">Live Signals</span>
        </div>
      </footer>

    </div>
  );
}
