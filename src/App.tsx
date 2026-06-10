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
  Globe,
  Bell,
  BellOff,
  User,
  Radio,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  ArrowRight,
  Settings,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Briefing, UserPreferences } from "./types";
import { InsightCard } from "./components/InsightCard";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  // App state
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loadingRadar, setLoadingRadar] = useState(false);
  const [radarError, setRadarError] = useState<string | null>(null);
  const [isKeyError, setIsKeyError] = useState(false);
  const [pollingTrigger, setPollingTrigger] = useState(0);

  // Preference editor drawer state (Notion-style collapsible drawer)
  const [showPreferencesPanel, setShowPreferencesPanel] = useState(false);
  const [newFeedUrl, setNewFeedUrl] = useState("");

  const userEmail = "neelimaneel3@gmail.com";
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default"
  );

  // Time stamp state
  const [timeState, setTimeState] = useState({
    dateStr: "August 15, 2026",
    timeStr: "09:42 AM GMT",
    minutesAgoStr: "5 minutes ago"
  });

  const loadData = async () => {
    try {
      const briefingsRes = await fetch("/api/briefings");
      if (briefingsRes.ok) {
        const briefs = await briefingsRes.json();
        setBriefings(briefs);
      }

      const prefRes = await fetch("/api/preferences");
      if (prefRes.ok) {
        const prefs = await prefRes.json();
        setPreferences(prefs);
      }
    } catch (e) {
      console.error("Error fetching state:", e);
    }
  };

  useEffect(() => {
    loadData();
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
      setPollingTrigger(prev => prev + 1);
    } catch (_) {}
  };

  // HTML5 native notifications requester
  const handleToggleNotifications = async () => {
    if (!("Notification" in window)) {
      alert("This browser does not support native notifications.");
      return;
    }
    
    if (Notification.permission === "granted") {
      triggerAnalytics("notifications_disabled", { previous_status: "granted" });
      setNotificationPermission("default");
    } else {
      const resp = await Notification.requestPermission();
      setNotificationPermission(resp);
      triggerAnalytics("notifications_permission_updated", { status: resp });
      
      if (resp === "granted") {
        new Notification("News Radar alerts active", {
          body: "You will be alerted pro-actively when new brief digests compile.",
          icon: "/favicon.ico"
        });
      }
    }
  };

  // RSS Add scraper helper
  const handleAddFeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedUrl.trim() || !preferences) return;
    
    try {
      new URL(newFeedUrl);
      const updatedFeeds = [...(preferences.custom_feeds || []), newFeedUrl.trim()];
      handleSavePreferences({
        ...preferences,
        custom_feeds: updatedFeeds
      });
      setNewFeedUrl("");
      triggerAnalytics("custom_feed_added", { url: newFeedUrl });
    } catch (_) {
      alert("Please provide a valid web URL starting with http:// or https://");
    }
  };

  const handleRemoveFeed = (feedUrl: string) => {
    if (!preferences) return;
    const filtered = (preferences.custom_feeds || []).filter(f => f !== feedUrl);
    handleSavePreferences({
      ...preferences,
      custom_feeds: filtered
    });
    triggerAnalytics("custom_feed_removed", { url: feedUrl });
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
    triggerAnalytics("categories_updated", { categories: updatedCats });
  };

  const handleFrequencyChange = (freq: "hourly" | "daily" | "weekly") => {
    if (!preferences) return;
    handleSavePreferences({
      ...preferences,
      frequency: freq
    });
    triggerAnalytics("frequency_updated", { frequency: freq });
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

  // Triggers professional synthesis (former Radar Sweep, now Refresh Briefing)
  const handleRefreshBriefing = async () => {
    if (loadingRadar) return;
    
    setLoadingRadar(true);
    setRadarError(null);
    setIsKeyError(false);
    
    triggerAnalytics("briefing_refresh_triggered", {
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
        throw new Error(data.error || "Synthesis interrupted. Verify API parameters in your settings.");
      }
      
      await loadData();
      setPollingTrigger(prev => prev + 1);
      
      if (Notification.permission === "granted") {
        const topHeadline = data.cards?.[0]?.headline || "Intelligence Brief Compiled";
        new Notification("News Radar: Briefing Compiled", {
          body: `${topHeadline.substring(0, 60)}...`,
          tag: "briefing-update"
        });
      }
    } catch (err: any) {
      setRadarError(err.message || "Refresh failed.");
      triggerAnalytics("briefing_refresh_failed", { reason: err.message });
    } finally {
      setLoadingRadar(false);
    }
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setSelectedDate(now);
      
      // Compute deterministic minutes/hours ago string for the current header
      const activeGenTime = briefings[0] ? new Date(briefings[0].generated_at) : null;
      if (activeGenTime) {
        const diffMs = now.getTime() - activeGenTime.getTime();
        const diffMins = Math.floor(diffMs / 1000 / 60);
        if (diffMins < 1) {
          setTimeState(prev => ({ ...prev, minutesAgoStr: "just now" }));
        } else if (diffMins === 1) {
          setTimeState(prev => ({ ...prev, minutesAgoStr: "1 minute ago" }));
        } else if (diffMins < 60) {
          setTimeState(prev => ({ ...prev, minutesAgoStr: `${diffMins} minutes ago` }));
        } else {
          const diffHours = Math.floor(diffMins / 60);
          setTimeState(prev => ({ ...prev, minutesAgoStr: diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago` }));
        }
      }
    };
    
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, [briefings]);

  // Set selected state for dynamic clock display
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const allAvailableCategories = ["AI & ML", "Startups & VC", "Biotech", "Fintech", "Green Tech", "Hardware", "SaaS"];

  const activeBriefing = briefings[0] || null;
  const historicBriefings = briefings.slice(1);

  // Grouping archive briefings by Today, Yesterday, and Last week for the intelligence journal
  const groupBriefingsByDate = (briefList: Briefing[]) => {
    const grouped = {
      today: [] as Briefing[],
      yesterday: [] as Briefing[],
      lastWeek: [] as Briefing[]
    };

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

    briefList.forEach((brief) => {
      const briefTime = new Date(brief.generated_at).getTime();
      if (briefTime >= startOfToday) {
        grouped.today.push(brief);
      } else if (briefTime >= startOfYesterday) {
        grouped.yesterday.push(brief);
      } else {
        grouped.lastWeek.push(brief);
      }
    });

    return grouped;
  };

  const archiveGroups = groupBriefingsByDate(historicBriefings);

  // Layout structures: Top Story is card index 0, ordinary updates are cards 1+
  const topStory = activeBriefing?.cards?.[0] || null;
  const ordinaryUpdates = activeBriefing?.cards?.slice(1, 5) || [];

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111827] flex flex-col font-sans antialiased select-none pb-12">
      
      {/* Key Missing Sticky Warning */}
      {isKeyError && (
        <div className="bg-red-600 text-white px-6 py-3.5 text-center text-xs font-semibold flex items-center justify-center gap-2.5 shadow-sm">
          <AlertTriangle size={15} className="shrink-0 animate-bounce" />
          <span>
            <strong>Gemini API Key Needed:</strong> To analyze topics dynamically, please save your API key in the <strong>Settings &gt; Secrets</strong> panel of Google AI Studio.
          </span>
        </div>
      )}

      {/* Modern, high-density minimal header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200/60 z-40 px-6 py-4.5">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Subtle logo & radar branding beside text */}
          <div className="flex items-center gap-3">
            {/* 80% Smaller Spinning Radar Subtle Branding Asset */}
            <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center text-white relative overflow-hidden shrink-0">
              <span className="absolute inset-0 border border-white/25 rounded-lg"></span>
              {/* Spinning microscopic sweeping light line */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/30 to-transparent animate-[spin_3s_linear_infinite]" />
              <Radio size={14} className="relative z-10 text-white" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-gray-900">News Radar</span>
                <span className="text-[10px] font-semibold bg-gray-100 border border-gray-200/50 text-gray-600 px-1.5 py-0.5 rounded-md">AI Agent</span>
              </div>
            </div>
          </div>

          {/* Options toolbar and user tags */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3.5">
            
            {/* HTML5 notification permissions requester */}
            <button
              onClick={handleToggleNotifications}
              title={notificationPermission === "granted" ? "Alert digests enabled" : "Enable browser alerts"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition duration-150 cursor-pointer ${
                notificationPermission === "granted"
                  ? "bg-blue-50/60 border-blue-100 text-blue-700 font-semibold shadow-sm"
                  : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Bell size={11} className={notificationPermission === "granted" ? "text-blue-600" : "text-gray-400"} />
              <span>{notificationPermission === "granted" ? "Alerts On" : "Enable Alerts"}</span>
            </button>

            {/* Profile widget */}
            <div className="flex items-center gap-2 bg-white border border-gray-200 pr-3 pl-2 py-1 rounded-full shadow-sm text-xs">
              <div className="h-5.5 w-5.5 rounded-full bg-gray-50 flex items-center justify-center border border-gray-250 text-gray-500">
                <User size={11} />
              </div>
              <span className="text-gray-600 font-medium text-[11px] max-w-[130px] truncate" title={userEmail}>
                {userEmail}
              </span>
            </div>

            {/* Customize Feeds / Preferences Notion-style trigger */}
            <button
              onClick={() => {
                setShowPreferencesPanel(!showPreferencesPanel);
                triggerAnalytics("preferences_toggled", { visible: !showPreferencesPanel });
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold cursor-pointer transition ${
                showPreferencesPanel
                  ? "bg-gray-950 border-gray-950 text-white shadow-sm"
                  : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Settings size={12} />
              <span>Configure feeds</span>
              {showPreferencesPanel ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>

          </div>
        </div>
      </header>

      {/* Bento Breaking News Ticker Panel */}
      <div className="border-b border-gray-200/50 bg-white">
        <div className="max-w-4xl mx-auto h-11 flex items-center px-6 gap-3.5 overflow-hidden">
          <span className="text-[10px] font-black text-red-600 uppercase tracking-wider flex items-center gap-1.5 shrink-0 select-none">
            <span className="h-1.5 w-1.5 bg-red-600 rounded-full inline-block animate-ping"></span>
            Breaking Update
          </span>
          <div className="flex-1 overflow-hidden relative">
            <div className="animate-marquee whitespace-nowrap text-xs font-medium text-gray-500 italic leading-none flex gap-16 select-none">
              <span>Major central banks signal coordinated policy shift regarding digital currencies • Tesla announces partnership with autonomous transit agency in Zurich • Global semiconductor shortage projected to end by Q4 2024 • NASA's James Webb Telescope discovers new water signs on exoplanet K2-18b...</span>
              <span>Major central banks signal coordinated policy shift regarding digital currencies • Tesla announces partnership with autonomous transit agency in Zurich • Global semiconductor shortage projected to end by Q4 2024 • NASA's James Webb Telescope discovers new water signs on exoplanet K2-18b...</span>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-blue-50 border border-blue-100/50 rounded-full px-2 py-0.5 shrink-0 select-none">
            <span className="text-[8px] font-bold text-blue-700 uppercase leading-none">Signals Live</span>
          </div>
        </div>
      </div>

      {/* Main Single Column Workspace container */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-6 py-8 flex flex-col gap-8">

        {/* Collapsible Notion-style configurations drawer */}
        <AnimatePresence>
          {showPreferencesPanel && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-2"
            >
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
                
                {/* Part A: Subscribed channels */}
                <div className="space-y-3">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900">Subscribed Channels</h3>
                    <p className="text-xs text-gray-500">Pick which intelligence verticals the algorithm highlights for your profile summaries.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {allAvailableCategories.map((cat) => {
                      const active = preferences?.categories.includes(cat);
                      return (
                        <button
                          key={cat}
                          onClick={() => handleCategoryPreferenceToggle(cat)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition cursor-pointer ${
                            active 
                              ? "bg-blue-600 border-blue-600 text-white shadow-sm" 
                              : "bg-white hover:bg-gray-50 text-gray-600 border-gray-200"
                          }`}
                        >
                          <span>{cat}</span>
                          {active && <Check size={11} className="stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Part B: Scrapers and satellites */}
                <div className="space-y-3 border-t border-gray-100 pt-5">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900">Custom Technology Feed Satellites</h3>
                    <p className="text-xs text-gray-500">Append custom XML, JSON, or RSS feed URLs. The ingestion pipeline auto-deduplicates and synthesizes these feeds instantly.</p>
                  </div>

                  <form onSubmit={handleAddFeed} className="flex gap-2">
                    <input
                      type="url"
                      required
                      placeholder="https://domain.com/rss-feed"
                      value={newFeedUrl}
                      onChange={(e) => setNewFeedUrl(e.target.value)}
                      className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer transition flex items-center gap-1 shrink-0 shadow-sm"
                    >
                      <Plus size={13} /> Add
                    </button>
                  </form>

                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {preferences?.custom_feeds.map((feed) => (
                      <div key={feed} className="flex items-center justify-between border border-gray-200 rounded-xl px-3 py-2 bg-gray-50/50 text-xs text-gray-600">
                        <span className="truncate pr-4 font-mono select-all text-xs">{feed}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFeed(feed)}
                          className="text-gray-400 hover:text-red-500 p-1 rounded-md transition"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    {(!preferences || preferences.custom_feeds.length === 0) && (
                      <p className="text-xs text-gray-400 italic">No custom feeds registered yet.</p>
                    )}
                  </div>
                </div>

                {/* Part C: Automatic compile sweep interval */}
                <div className="space-y-3 border-t border-gray-100 pt-5">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900">Automatic compilation interval</h3>
                    <p className="text-xs text-gray-500">Pick how frequently deep-learning clustering algorithms trigger sweeps automatically.</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["hourly", "daily", "weekly"] as const).map((freq) => {
                      const active = preferences?.frequency === freq;
                      return (
                        <button
                          key={freq}
                          onClick={() => handleFrequencyChange(freq)}
                          className={`px-3 py-2 rounded-xl border text-xs font-semibold uppercase tracking-wide transition cursor-pointer ${
                            active
                              ? "bg-blue-600 border-blue-600 text-white font-bold shadow-sm"
                              : "bg-white hover:bg-gray-50 border-gray-200 text-gray-600"
                          }`}
                        >
                          {freq}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SECTION 1: Personalization visibility pillbox at the top */}
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-2xl p-4.5 shadow-sm text-xs select-none">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-gray-400 font-semibold">Following:</span>
            {preferences && preferences.categories.length > 0 ? (
              preferences.categories.map((cat, idx) => (
                <span key={cat} className="inline-flex items-center gap-1 text-gray-700 font-medium">
                  {idx > 0 && <span className="text-gray-300">•</span>}
                  <span className="bg-slate-50 text-gray-800 border border-gray-150 px-2.5 py-0.5 rounded-full font-semibold text-[11px] shadow-sm">
                    ✓ {cat}
                  </span>
                </span>
              ))
            ) : (
              <span className="text-gray-500 italic">No preferences selected</span>
            )}
          </div>
          
          {/* Subtle Refresh button (Refresh Briefing) */}
          <button
            onClick={handleRefreshBriefing}
            disabled={loadingRadar}
            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-semibold cursor-pointer active:scale-95 transition"
            title="Refresh information briefing right now"
          >
            <RefreshCw size={13} className={loadingRadar ? "animate-spin" : ""} />
            <span>{loadingRadar ? "Compiling..." : "Refresh Briefing"}</span>
          </button>
        </div>

        {/* SECTION 2: Briefing digest summary block */}
        <div className="bg-gray-900 border border-gray-950 text-white rounded-2xl p-6.5 shadow-[0_2px_8px_rgba(0,0,0,0.06)] relative overflow-hidden">
          
          {/* Subtle abstract lines or elements */}
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none select-none">
            <Radio size={144} className="translate-x-12 translate-y-12 shrink-0 text-white" />
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <span className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/20 text-blue-400 px-3 py-1 rounded-full text-xs font-bold leading-none select-none">
                <Sparkles size={11} /> Briefing Ready
              </span>
              <span className="text-[11px] text-gray-400 font-medium">
                Refreshed {timeState.minutesAgoStr}
              </span>
            </div>

            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white leading-snug">
              📰 {activeBriefing?.cards?.length || 0} Important Updates Since Your Last Brief
            </h2>

            <div className="flex items-center gap-4 text-xs text-gray-300 font-medium pt-2 border-t border-gray-800/80">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500">Read Time:</span>
                <span className="text-white font-bold">Under 60 Seconds</span>
              </div>
              <span className="text-gray-700">•</span>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500">Focus Hub:</span>
                <span className="text-white font-bold">Technology &amp; Startups</span>
              </div>
            </div>
          </div>
        </div>

        {radarError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs font-semibold text-red-700 leading-relaxed flex items-start gap-2">
            <AlertTriangle size={15} className="shrink-0 mt-0.5 text-red-600" />
            <div>
              <p className="font-bold">Briefing build interrupted</p>
              <p className="text-red-600/80 font-normal mt-0.5">{radarError}</p>
            </div>
          </div>
        )}

        {/* SECTION 3: TOP STORY */}
        {topStory ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs uppercase font-extrabold tracking-wider text-gray-400 flex items-center gap-1.5">
                🔥 Top Story
              </h2>
            </div>
            
            <InsightCard
              card={topStory}
              isTopStory={true}
              onFeedbackSubmitted={() => setPollingTrigger(prev => prev + 1)}
            />
          </div>
        ) : (
          <div className="border border-gray-200 border-dashed rounded-2xl p-12 text-center bg-white">
            <Sparkles className="text-gray-300 mx-auto mb-3" size={24} />
            <p className="text-sm font-semibold text-gray-700 mb-1">Your Intelligence Board is quiet</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              No briefs generated yet. Click &ldquo;Refresh Briefing&rdquo; to fetch the latest technology items.
            </p>
          </div>
        )}

        {/* SECTION 4: OTHER IMPORTANT UPDATES */}
        {ordinaryUpdates.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xs uppercase font-extrabold tracking-wider text-gray-400">
              ⚡ Other Important Updates
            </h2>
            
            <div className="space-y-4">
              {ordinaryUpdates.map((card) => (
                <InsightCard
                  key={card.id}
                  card={card}
                  isTopStory={false}
                  onFeedbackSubmitted={() => setPollingTrigger(prev => prev + 1)}
                />
              ))}
            </div>
          </div>
        )}

        {/* SECTION 5: ARCHIVED INTELLIGENCE JOURNAL */}
        <div className="space-y-6 pt-6 border-t border-gray-200/50">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-gray-900 mb-1 flex items-center gap-2">
              <History size={16} className="text-gray-400 shrink-0" />
              Previous Briefings
            </h2>
            <p className="text-xs text-gray-500">Your personal chronological intelligence journal.</p>
          </div>

          <div className="space-y-5">
            {/* Today's older briefs */}
            {archiveGroups.today.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-400 tracking-wide uppercase px-1">Today</h3>
                <div className="grid grid-cols-1 gap-3">
                  {archiveGroups.today.map((brief, idx) => (
                    <div key={brief.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between text-xs text-gray-400 border-b border-gray-50 pb-2.5">
                        <span className="font-semibold text-gray-700">Digest Briefing #{historicBriefings.length - idx}</span>
                        <span>{new Date(brief.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="space-y-3">
                        {brief.cards.map((card) => (
                          <div key={card.id} className="text-xs">
                            <h4 className="font-bold text-gray-800 hover:text-blue-600 transition truncate cursor-help" title={card.headline}>{card.headline}</h4>
                            <p className="text-gray-500 leading-relaxed mt-1 text-[11px] line-clamp-2">{card.summary}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Yesterday's briefs */}
            {archiveGroups.yesterday.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-400 tracking-wide uppercase px-1">Yesterday</h3>
                <div className="grid grid-cols-1 gap-3">
                  {archiveGroups.yesterday.map((brief, idx) => (
                    <div key={brief.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between text-xs text-gray-400 border-b border-gray-50 pb-2.5">
                        <span className="font-semibold text-gray-700">Digest Briefing #{historicBriefings.length - archiveGroups.today.length - idx}</span>
                        <span>Yesterday</span>
                      </div>
                      <div className="space-y-3">
                        {brief.cards.map((card) => (
                          <div key={card.id} className="text-xs">
                            <h4 className="font-bold text-gray-800 hover:text-blue-600 transition truncate cursor-help" title={card.headline}>{card.headline}</h4>
                            <p className="text-gray-500 leading-relaxed mt-1 text-[11px] line-clamp-2">{card.summary}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Previous Week's older briefs */}
            {archiveGroups.lastWeek.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-400 tracking-wide uppercase px-1">Last Week</h3>
                <div className="grid grid-cols-1 gap-3">
                  {archiveGroups.lastWeek.map((brief, idx) => (
                    <div key={brief.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between text-xs text-gray-400 border-b border-gray-50 pb-2.5">
                        <span className="font-semibold text-gray-700">Digest Briefing #{archiveGroups.lastWeek.length - idx}</span>
                        <span>{new Date(brief.generated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      </div>
                      <div className="space-y-3">
                        {brief.cards.map((card) => (
                          <div key={card.id} className="text-xs">
                            <h4 className="font-bold text-gray-800 hover:text-blue-600 transition truncate cursor-help" title={card.headline}>{card.headline}</h4>
                            <p className="text-gray-500 leading-relaxed mt-1 text-[11px] line-clamp-2">{card.summary}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {historicBriefings.length === 0 && (
              <div className="p-8 border border-gray-200 border-dashed rounded-2xl text-center bg-gray-50/50 text-xs italic text-gray-400 leading-relaxed">
                No past intelligence briefings are catalogued. Scored news bulletins persist here over sessions.
              </div>
            )}
          </div>
        </div>

      </main>

      {/* Premium Clean Footer */}
      <footer className="py-12 mt-12 text-center text-xs text-gray-400">
        <div className="max-w-2xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200/50 pt-8">
          <span className="font-medium text-gray-400">&copy; {new Date().getFullYear()} News Radar. Premium Saas intelligence.</span>
          <span className="flex items-center gap-1.5 text-[11px] text-gray-400 font-semibold select-none">
            <Radio size={11} className="text-blue-600 animate-pulse" /> Grounded in Google Search &amp; CNBC Feeds
          </span>
        </div>
      </footer>

    </div>
  );
}
