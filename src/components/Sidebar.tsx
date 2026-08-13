/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Zap, History, Settings } from "lucide-react";
import { RadarLogo } from "../App";

interface SidebarProps {
  activeTab: "latest" | "archives" | "preferences";
  onSelectTab: (tab: "latest" | "archives" | "preferences") => void;
  theme: "dark" | "light";
}

export function Sidebar({ activeTab, onSelectTab, theme }: SidebarProps) {
  const isDark = theme === "dark";

  return (
    <aside
      className={`w-[260px] hidden lg:flex flex-col h-screen sticky top-0 shrink-0 border-r z-30 transition-colors duration-200 ${
        isDark
          ? "bg-[#0c111d] border-slate-800/80 text-slate-300"
          : "bg-[#f4f6f8] border-gray-200 text-gray-700"
      }`}
    >
      {/* Brand Header */}
      <div
        className={`p-6 flex items-center gap-3 border-b ${
          isDark ? "border-slate-800/80" : "border-gray-200"
        }`}
      >
        <RadarLogo size={36} theme={theme} />
        <div className="flex flex-col min-w-0">
          <span
            className={`font-black uppercase tracking-tight text-[15px] ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            NEWS RADAR
          </span>
          <span className="text-[11px] text-slate-400 font-medium leading-snug mt-0.5">
            Stay informed without seeking information.
          </span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        <button
          type="button"
          onClick={() => onSelectTab("latest")}
          className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition cursor-pointer text-left ${
            activeTab === "latest"
              ? isDark
                ? "bg-[#162036] text-white border border-cyan-500/30 shadow-[0_2px_10px_rgba(0,229,255,0.08)]"
                : "bg-white text-gray-900 shadow-sm border border-gray-250"
              : isDark
                ? "text-slate-400 hover:bg-slate-800/40 hover:text-white"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          <Zap
            size={16}
            className={
              activeTab === "latest"
                ? "text-cyan-400 shrink-0"
                : "text-gray-400 shrink-0"
            }
          />
          <span>Latest Briefing</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab("archives")}
          className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition cursor-pointer text-left ${
            activeTab === "archives"
              ? isDark
                ? "bg-[#162036] text-white border border-cyan-500/30 shadow-[0_2px_10px_rgba(0,229,255,0.08)]"
                : "bg-white text-gray-900 shadow-sm border border-gray-250"
              : isDark
                ? "text-slate-400 hover:bg-slate-800/40 hover:text-white"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          <History
            size={16}
            className={
              activeTab === "archives"
                ? "text-cyan-400 shrink-0"
                : "text-gray-400 shrink-0"
            }
          />
          <span>Archives</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab("preferences")}
          className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition cursor-pointer text-left ${
            activeTab === "preferences"
              ? isDark
                ? "bg-[#162036] text-cyan-400 border border-cyan-500/30 shadow-[0_2px_10px_rgba(0,229,255,0.08)]"
                : "bg-white text-blue-600 shadow-sm border border-gray-250"
              : isDark
                ? "text-slate-400 hover:bg-slate-800/40 hover:text-white"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          <Settings size={16} className="shrink-0" />
          <span>Preferences</span>
        </button>
      </nav>
    </aside>
  );
}
