/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { BriefingCard } from "../types";

interface StoryQueueProps {
  cards: BriefingCard[];
  activeCardId: string;
  readStoryIds: string[];
  onSelectStory: (cardId: string) => void;
  theme?: "dark" | "light";
}

export function StoryQueue({
  cards,
  activeCardId,
  readStoryIds,
  onSelectStory,
  theme = "dark"
}: StoryQueueProps) {
  const isDark = theme === "dark";
  const totalCount = cards.length;
  const readCount = cards.filter(c => readStoryIds.includes(c.id)).length;
  const percentRead = totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0;

  return (
    <div
      className={`rounded-2xl border p-4.5 flex flex-col gap-3 transition-colors ${
        isDark
          ? "bg-[#0d121f] border-slate-800/90 text-slate-200"
          : "bg-white border-gray-200 text-gray-800 shadow-sm"
      }`}
    >
      {/* Queue Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/40 dark:border-slate-800/60">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            STORY QUEUE
          </span>
          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
            isDark ? "bg-slate-800 text-slate-300" : "bg-gray-100 text-gray-700"
          }`}>
            {totalCount} Stories
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold text-cyan-400 tracking-wider">
          {percentRead}% READ
        </span>
      </div>

      {/* Story Items List */}
      <div className="flex flex-col gap-2">
        {cards.map((card, index) => {
          const isRead = readStoryIds.includes(card.id);
          const isActive = activeCardId === card.id;
          const storyNum = String(index + 1).padStart(2, "0");

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onSelectStory(card.id)}
              className={`w-full text-left p-3 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col gap-1.5 relative overflow-hidden group ${
                isActive
                  ? isDark
                    ? "bg-[#151f35] border-cyan-500/80 ring-1 ring-cyan-500/40 text-white shadow-[0_2px_14px_rgba(0,229,255,0.12)]"
                    : "bg-blue-50/80 border-blue-500 ring-1 ring-blue-500/30 text-blue-950 font-semibold shadow-sm"
                  : isRead
                    ? isDark
                      ? "bg-[#0a0e18]/60 border-slate-800/50 text-slate-400 hover:text-slate-200 hover:bg-[#111726]/60"
                      : "bg-gray-50/80 border-gray-150 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                    : isDark
                      ? "bg-[#111726]/80 border-slate-800 text-slate-300 hover:bg-[#162035] hover:border-slate-700"
                      : "bg-white border-gray-200 text-gray-800 hover:bg-gray-50 hover:border-gray-300"
              }`}
            >
              {/* Active Indicator Bar on left edge */}
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400 rounded-r-full" />
              )}

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-[11px] font-black shrink-0 ${
                      isActive
                        ? "text-cyan-400"
                        : isRead
                          ? "text-slate-500"
                          : "text-slate-400"
                    }`}
                  >
                    {storyNum}
                  </span>
                  <span
                    className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded border leading-none ${
                      card.priority === "TOP STORY"
                        ? isDark
                          ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                        : isDark
                          ? "bg-slate-800/80 text-slate-400 border-slate-700/50"
                          : "bg-gray-100 text-gray-600 border-gray-200"
                    }`}
                  >
                    {card.category || "General"}
                  </span>
                </div>

                {/* Status Indicator Icon */}
                <div className="flex items-center gap-1 shrink-0">
                  {isRead ? (
                    <CheckCircle2
                      size={14}
                      className={isDark ? "text-cyan-400" : "text-blue-600"}
                    />
                  ) : isActive ? (
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00E5FF]" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-slate-600 dark:bg-slate-700" />
                  )}
                </div>
              </div>

              {/* Headline */}
              <h4
                className={`text-xs font-bold leading-snug line-clamp-2 ${
                  isActive
                    ? isDark
                      ? "text-white"
                      : "text-blue-950"
                    : isRead
                      ? isDark
                        ? "text-slate-400 font-medium"
                        : "text-gray-500 font-medium"
                      : isDark
                        ? "text-slate-200"
                        : "text-gray-800"
                }`}
              >
                {card.headline}
              </h4>
            </button>
          );
        })}
      </div>
    </div>
  );
}
