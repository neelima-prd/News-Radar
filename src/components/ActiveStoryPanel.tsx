/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  ExternalLink,
  ChevronRight,
  Check,
  ArrowRight,
  Sparkles,
  Info
} from "lucide-react";
import { BriefingCard } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface ActiveStoryPanelProps {
  card: BriefingCard;
  isRead: boolean;
  onMarkAsRead: () => void | Promise<void>;
  onNextStory: () => void;
  hasNextStory: boolean;
  theme?: "dark" | "light";
  storyIndex: number;
  totalStories: number;
}

export function ActiveStoryPanel({
  card,
  isRead,
  onMarkAsRead,
  onNextStory,
  hasNextStory,
  theme = "dark",
  storyIndex,
  totalStories
}: ActiveStoryPanelProps) {
  const [showSources, setShowSources] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Reset image error state when active card changes
  useEffect(() => {
    setImageError(false);
    setShowSources(false);
  }, [card.id]);

  const isDark = theme === "dark";

  const defaultWhySelected = [
    `Matches your ${card.category} interest`,
    "High industry impact across technology sectors",
    "Covered by multiple verified publications"
  ];

  const whySelectedPoints =
    Array.isArray(card.why_selected) && card.why_selected.length > 0
      ? card.why_selected
      : defaultWhySelected;

  const validSources =
    Array.isArray(card.source_articles) && card.source_articles.length > 0
      ? card.source_articles
      : [
          {
            title: card.headline,
            url: "https://news.ycombinator.com",
            source: card.category || "Tech Feed"
          }
        ];

  const sourcesCount = validSources.length;
  const sourceNamesStr = validSources
    .map((s) => s.source)
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(" · ");

  const imageUrl = card.image_url || validSources[0]?.image_url;

  return (
    <motion.div
      key={card.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={`rounded-2xl border flex flex-col overflow-hidden shadow-lg transition-colors ${
        isDark
          ? "bg-[#0f1524] border-slate-800 text-slate-100"
          : "bg-white border-gray-200 text-gray-900 shadow-md"
      }`}
    >
      {/* 1. Category / Status Header */}
      <div
        className={`flex items-center justify-between px-6 py-4 border-b ${
          isDark ? "border-slate-800/80 bg-[#111827]/70" : "border-gray-150 bg-gray-50/80"
        }`}
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <span
            className={`text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-lg border leading-none ${
              card.priority === "TOP STORY"
                ? isDark
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  : "bg-amber-50 text-amber-800 border-amber-200 font-bold"
                : isDark
                  ? "bg-sky-500/15 text-sky-300 border-sky-500/30"
                  : "bg-blue-50 text-blue-800 border-blue-200 font-bold"
            }`}
          >
            {card.priority || "IMPORTANT"}
          </span>

          <span
            className={`text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-lg border leading-none ${
              card.category === "Startups"
                ? isDark
                  ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"
                  : "bg-indigo-50 text-indigo-800 border-indigo-200"
                : isDark
                  ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/20"
                  : "bg-sky-50 text-sky-800 border-sky-200"
            }`}
          >
            {card.category}
          </span>

          <span className="text-xs font-mono font-medium text-slate-400 dark:text-slate-500 ml-1">
            Story {storyIndex + 1} of {totalStories}
          </span>
        </div>

        {isRead && (
          <span
            className={`text-xs font-bold flex items-center gap-1 px-2.5 py-0.5 rounded-full ${
              isDark
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }`}
          >
            <Check size={13} className="stroke-[3]" /> Read
          </span>
        )}
      </div>

      {/* 2. Editorial 16:9 News Image */}
      {imageUrl && !imageError ? (
        <div className="relative w-full aspect-[16/9] overflow-hidden bg-slate-900 border-b border-slate-800/80 group">
          <img
            src={imageUrl}
            alt={card.headline}
            onError={() => setImageError(true)}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-102"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f1524] via-transparent to-transparent opacity-80 pointer-events-none" />
        </div>
      ) : (
        <div
          className={`w-full h-3 bg-gradient-to-r ${
            card.priority === "TOP STORY"
              ? "from-amber-500/40 via-cyan-500/30 to-slate-800"
              : "from-cyan-500/30 via-sky-500/20 to-slate-800"
          }`}
        />
      )}

      {/* Main Content Body */}
      <div className="p-6 md:p-8 flex flex-col gap-6 flex-1">
        {/* 3. Headline */}
        <h2
          className={`text-xl md:text-2xl font-extrabold tracking-tight leading-snug ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          {card.headline}
        </h2>

        {/* 4. Executive Summary */}
        <p
          className={`text-sm md:text-base leading-relaxed ${
            isDark ? "text-slate-300" : "text-gray-700"
          }`}
        >
          {card.summary}
        </p>

        {/* 5. WHY THIS MATTERS */}
        <div
          className={`rounded-xl p-5 border transition-all ${
            isDark
              ? "bg-[#131e33] border-cyan-500/30 text-slate-200 shadow-[0_2px_12px_rgba(0,229,255,0.06)]"
              : "bg-blue-50/80 border-blue-200 text-gray-900"
          }`}
        >
          <div
            className={`text-[11px] font-black tracking-widest uppercase mb-2 flex items-center gap-1.5 ${
              isDark ? "text-cyan-400" : "text-blue-700"
            }`}
          >
            <Sparkles size={13} />
            <span>Why This Matters</span>
          </div>
          <p className="text-sm leading-relaxed font-medium">
            {card.why_it_matters}
          </p>
        </div>

        {/* 6. WHY YOU'RE SEEING THIS */}
        <div
          className={`rounded-xl p-4 text-xs space-y-2 border ${
            isDark
              ? "bg-[#0b0f19]/70 border-slate-800/80 text-slate-300"
              : "bg-gray-50 border-gray-200 text-gray-700"
          }`}
        >
          <div
            className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${
              isDark ? "text-slate-400" : "text-gray-500"
            }`}
          >
            <Info size={12} />
            <span>Why you're seeing this</span>
          </div>
          <div className="space-y-1 pl-1">
            {whySelectedPoints.map((pt, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span
                  className={`font-bold ${
                    isDark ? "text-cyan-400" : "text-blue-600"
                  }`}
                >
                  •
                </span>
                <span className="text-xs leading-snug">{pt}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 7. COVERAGE SOURCES */}
        <div
          className={`pt-4 border-t ${
            isDark ? "border-slate-800/80" : "border-gray-150"
          }`}
        >
          <button
            type="button"
            onClick={() => setShowSources(!showSources)}
            className={`flex items-center gap-2 text-xs font-bold tracking-wide transition text-left cursor-pointer ${
              isDark
                ? "text-slate-400 hover:text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <ChevronRight
              size={15}
              className={`transform transition-transform text-cyan-400 shrink-0 ${
                showSources ? "rotate-90" : ""
              }`}
            />
            <span className="line-clamp-1">
              Coverage Sources ({sourcesCount})
              {sourceNamesStr && (
                <span className="font-normal opacity-75 ml-1.5">
                  · {sourceNamesStr}
                </span>
              )}
            </span>
          </button>

          <AnimatePresence>
            {showSources && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-3"
              >
                <div
                  className={`rounded-xl p-4 space-y-2.5 text-xs border ${
                    isDark
                      ? "bg-[#0b0f1a] border-slate-800/80"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  {validSources.map((art, idx) => (
                    <a
                      key={idx}
                      href={art.url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      referrerPolicy="no-referrer"
                      className={`flex items-start gap-3 p-2 rounded-lg transition ${
                        isDark
                          ? "text-slate-300 hover:text-cyan-300 hover:bg-slate-800/50"
                          : "text-gray-700 hover:text-blue-600 hover:bg-white"
                      }`}
                    >
                      <BookOpen size={14} className="mt-0.5 text-slate-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span
                          className={`font-bold ${
                            isDark ? "text-cyan-400" : "text-blue-700"
                          }`}
                        >
                          [{art.source || "Source"}]
                        </span>{" "}
                        <span className="hover:underline">{art.title}</span>
                      </div>
                      <ExternalLink size={12} className="mt-0.5 text-slate-400 shrink-0" />
                    </a>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 8. Action Controls Bar */}
      <div
        className={`px-6 py-4 border-t flex items-center justify-between gap-4 ${
          isDark
            ? "bg-[#0d121f] border-slate-800/80"
            : "bg-gray-50/80 border-gray-150"
        }`}
      >
        <button
          type="button"
          onClick={onMarkAsRead}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            isRead
              ? isDark
                ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-400"
                : "bg-emerald-50 border border-emerald-300 text-emerald-800"
              : isDark
                ? "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                : "bg-gray-200 hover:bg-gray-300 text-gray-900 border border-gray-300"
          }`}
        >
          <Check size={15} className={isRead ? "stroke-[3.5]" : ""} />
          <span>{isRead ? "Marked as Read" : "Mark as Read"}</span>
        </button>

        {hasNextStory && (
          <button
            type="button"
            onClick={onNextStory}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              isDark
                ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(0,229,255,0.25)]"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            }`}
          >
            <span>Next Story</span>
            <ArrowRight size={14} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
