/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { RefreshCw, Sun, Moon, Sparkles } from "lucide-react";
import { RadarLogo } from "../App";

interface HeaderBarProps {
  totalStoriesCount: number;
  readStoriesCount: number;
  loadingRadar: boolean;
  onRefreshBriefing: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onOpenMobileMenu?: () => void;
}

export function HeaderBar({
  totalStoriesCount,
  readStoriesCount,
  loadingRadar,
  onRefreshBriefing,
  theme,
  onToggleTheme
}: HeaderBarProps) {
  const isDark = theme === "dark";

  const getGreetingText = () => {
    const hours = new Date().getHours();
    if (hours < 12) return "Good morning.";
    if (hours < 18) return "Good afternoon.";
    return "Good evening.";
  };

  return (
    <header
      className={`sticky top-0 z-40 px-6 py-4 border-b backdrop-blur-md transition-colors ${
        isDark
          ? "bg-[#0b0f19]/85 border-slate-800/80 text-white"
          : "bg-[#fcfdfd]/85 border-gray-200/80 text-[#111827]"
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left Greeting & Subtitle */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex lg:hidden items-center gap-2 mr-2">
              <RadarLogo size={24} theme={theme} />
            </div>
            <h1
              className={`text-xl md:text-2xl font-black tracking-tight ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              {getGreetingText()}
            </h1>
          </div>
          <p
            className={`text-xs md:text-sm font-medium mt-0.5 tracking-tight ${
              isDark ? "text-slate-400" : "text-gray-600"
            }`}
          >
            <span className={isDark ? "text-cyan-400 font-bold" : "text-blue-600 font-bold"}>
              {totalStoriesCount}
            </span>{" "}
            important updates since your last brief.
          </p>
        </div>

        {/* Right Status & Controls */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Subtle Compact Progress Line */}
          <div
            className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${
              isDark
                ? "bg-[#111726] border-slate-800 text-slate-300"
                : "bg-gray-100 border-gray-200 text-gray-700"
            }`}
          >
            <Sparkles size={12} className={isDark ? "text-cyan-400" : "text-blue-600"} />
            <span>
              {readStoriesCount} of {totalStoriesCount} read
            </span>
          </div>

          {/* Refresh Briefing */}
          <button
            type="button"
            onClick={onRefreshBriefing}
            disabled={loadingRadar}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              isDark
                ? "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            }`}
          >
            <RefreshCw size={13} className={loadingRadar ? "animate-spin" : ""} />
            <span className="hidden md:inline">
              {loadingRadar ? "Refreshing..." : "Refresh"}
            </span>
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            className={`p-2 rounded-xl border cursor-pointer transition ${
              isDark
                ? "bg-slate-800 border-slate-700 text-yellow-300 hover:bg-slate-700"
                : "bg-white border-gray-200 text-gray-700 shadow-sm hover:bg-gray-50"
            }`}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </div>
    </header>
  );
}
