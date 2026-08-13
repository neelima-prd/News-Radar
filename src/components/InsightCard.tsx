/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { BookOpen, ExternalLink, ChevronRight, Check, ArrowRight } from "lucide-react";
import { BriefingCard } from "../types";
import { motion, AnimatePresence } from "motion/react";

export function InsightCard({
  card,
  isTopStory = false,
  theme = "dark",
  isRead = false,
  onMarkAsRead,
  onNextStory,
  hasNextStory = false,
  isActive = false
}: {
  key?: React.Key;
  card: BriefingCard;
  isTopStory?: boolean;
  theme?: "dark" | "light";
  isRead?: boolean;
  onMarkAsRead?: () => void | Promise<void>;
  onNextStory?: () => void;
  hasNextStory?: boolean;
  isActive?: boolean;
}) {
  const [showSources, setShowSources] = useState(false);
  const [imageError, setImageError] = useState(false);

  const getPriorityBadgeClass = (priority: string) => {
    if (priority === "TOP STORY") {
      return theme === "dark" 
        ? "bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]" 
        : "bg-amber-50 text-amber-800 border-amber-200 font-bold";
    }
    if (priority === "IMPORTANT") {
      return theme === "dark"
        ? "bg-sky-500/15 text-sky-300 border-sky-500/30"
        : "bg-blue-50 text-blue-800 border-blue-200";
    }
    return theme === "dark"
      ? "bg-slate-800/60 text-slate-400 border-slate-700/50"
      : "bg-gray-100 text-gray-700 border-gray-200";
  };

  const defaultWhySelected = [
    `Matches your ${card.category} interest`,
    "High industry impact across technology sectors",
    "Covered by multiple verified publications"
  ];

  const whySelectedPoints = Array.isArray(card.why_selected) && card.why_selected.length > 0
    ? card.why_selected
    : defaultWhySelected;

  const validSources = Array.isArray(card.source_articles) && card.source_articles.length > 0
    ? card.source_articles
    : [{ title: card.headline, url: "https://news.ycombinator.com", source: card.category || "Tech Feed" }];

  const sourcesCount = validSources.length;
  const sourceNamesStr = validSources
    .map(s => s.source)
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(" · ");

  const imageUrl = card.image_url || validSources[0]?.image_url;

  return (
    <motion.div
      layout
      id={`insight-card-${card.id}`}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className={`rounded-2xl transition-all duration-300 border flex flex-col overflow-hidden ${
        isRead
          ? theme === "dark"
            ? "bg-[#0f1422]/60 border-slate-800/50 opacity-80"
            : "bg-gray-50/70 border-gray-200/70 opacity-85"
          : isActive
            ? theme === "dark"
              ? "bg-[#111728] border-sky-400 ring-1 ring-sky-400/30 shadow-[0_4px_24px_rgba(14,165,233,0.15)]"
              : "bg-white border-blue-600 ring-1 ring-blue-500/30 shadow-md"
            : theme === "dark"
              ? card.priority === "TOP STORY"
                ? "bg-[#111728] border-amber-500/30 shadow-[0_4px_20px_rgba(245,158,11,0.06)]"
                : "bg-[#111625]/85 border-[#20293a] hover:border-[#334155]"
              : card.priority === "TOP STORY"
                ? "bg-white border-amber-200 shadow-sm ring-1 ring-amber-100"
                : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm"
      }`}
    >
      {/* Card Header element */}
      <div className={`flex items-center justify-between px-6 py-4 border-b ${
        theme === "dark" ? "border-slate-800/60" : "border-gray-100"
      }`}>
        <div className="flex items-center gap-2.5">
          <span className={`text-[11px] font-black tracking-wider uppercase px-2.5 py-1 rounded-lg border leading-none shrink-0 ${getPriorityBadgeClass(card.priority || "IMPORTANT")}`}>
            {card.priority || "IMPORTANT"}
          </span>
          <span className={`text-[11px] font-extrabold tracking-wide uppercase px-2.5 py-1 rounded-lg border leading-none ${
            card.category === "Startups"
              ? theme === "dark" ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20" : "bg-indigo-50 text-indigo-800 border-indigo-200"
              : theme === "dark" ? "bg-sky-500/10 text-sky-300 border-sky-500/20" : "bg-blue-50 text-blue-800 border-blue-200"
          }`}>
            {card.category}
          </span>
        </div>

        {isRead && (
          <span className={`text-xs font-bold flex items-center gap-1 ${
            theme === "dark" ? "text-emerald-400" : "text-emerald-600"
          }`}>
            <Check size={14} className="stroke-[3]" /> Read
          </span>
        )}
      </div>

      {/* Prominent News Article Image */}
      {imageUrl && !imageError ? (
        <div className="relative w-full aspect-[16/9] overflow-hidden bg-slate-900 border-b border-slate-800/60">
          <img
            src={imageUrl}
            alt={card.headline}
            onError={() => setImageError(true)}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
        </div>
      ) : (
        <div className={`w-full h-2.5 bg-gradient-to-r ${
          card.priority === "TOP STORY" 
            ? "from-amber-500/30 via-sky-500/20 to-transparent" 
            : "from-sky-500/20 via-slate-700/20 to-transparent"
        }`} />
      )}

      {/* Main Content body */}
      <div className={`flex-1 flex flex-col ${isTopStory ? "p-6 md:p-7" : "p-5 md:p-6"}`}>
        <h3 className={`font-bold tracking-tight leading-snug mb-3.5 ${
          theme === "dark" ? "text-white" : "text-gray-900"
        } ${isTopStory ? "text-xl md:text-2xl" : "text-base md:text-lg"}`}>
          {card.headline}
        </h3>

        {/* Executive summary paragraph */}
        <p className={`leading-relaxed mb-5 ${
          theme === "dark" ? "text-slate-300" : "text-gray-600"
        } ${isTopStory ? "text-[14.5px] md:text-[15px]" : "text-sm"}`}>
          {card.summary}
        </p>

        {/* Why This Matters block */}
        <div className={`rounded-xl p-4 mb-4 border ${
          theme === "dark" 
            ? "bg-sky-950/25 border-sky-500/20 text-slate-200" 
            : "bg-blue-50/60 border-blue-100 text-gray-800"
        }`}>
          <div className={`text-[11px] font-black tracking-wider uppercase mb-1.5 flex items-center gap-1.5 ${
            theme === "dark" ? "text-sky-400" : "text-blue-700"
          }`}>
            <span>Why This Matters</span>
          </div>
          <p className="text-xs md:text-sm leading-relaxed font-medium">
            {card.why_it_matters}
          </p>
        </div>

        {/* Why you're seeing this transparency block */}
        <div className={`rounded-xl p-3.5 mb-4 text-xs space-y-1.5 ${
          theme === "dark" ? "bg-slate-900/40 border border-slate-800/50" : "bg-gray-50 border border-gray-150"
        }`}>
          <div className={`text-[10px] font-bold uppercase tracking-wider ${
            theme === "dark" ? "text-slate-500" : "text-gray-500"
          }`}>
            Why you're seeing this
          </div>
          <div className="space-y-1">
            {whySelectedPoints.map((pt, idx) => (
              <div key={idx} className={`flex items-start gap-2 ${
                theme === "dark" ? "text-slate-300" : "text-gray-700"
              }`}>
                <span className={`font-bold mt-0.5 ${theme === "dark" ? "text-sky-400" : "text-blue-600"}`}>•</span>
                <span className="text-[11.5px] leading-snug">{pt}</span>
              </div>
            ))}
          </div>
        </div>

        {/* References list */}
        <div className={`mt-auto pt-3 border-t ${
          theme === "dark" ? "border-slate-800/60" : "border-gray-100"
        }`}>
          <button
            onClick={() => setShowSources(!showSources)}
            className={`flex items-center gap-1.5 text-xs font-bold tracking-wide transition text-left cursor-pointer ${
              theme === "dark" ? "text-slate-400 hover:text-white" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <ChevronRight size={14} className={`transform transition-transform text-gray-400 shrink-0 ${showSources ? "rotate-90 text-blue-500" : ""}`} />
            <span className="line-clamp-1">
              Coverage Sources ({sourcesCount})
              {sourceNamesStr && (
                <span className="font-normal opacity-75 ml-1">· {sourceNamesStr}</span>
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
                <div className={`rounded-xl p-3.5 space-y-2 text-xs ${
                  theme === "dark" ? "bg-slate-900/60 border border-slate-800/50" : "bg-gray-50 border border-gray-150"
                }`}>
                  {validSources.map((art, idx) => (
                    <a
                      key={idx}
                      href={art.url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      referrerPolicy="no-referrer"
                      className={`flex items-start gap-2.5 text-xs border-b pb-2 last:pb-0 last:border-0 transition ${
                        theme === "dark" 
                          ? "text-slate-300 hover:text-sky-400 border-slate-800/40" 
                          : "text-gray-600 hover:text-blue-600 border-gray-100"
                      }`}
                    >
                      <BookOpen size={13} className="mt-0.5 text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className={`font-semibold ${
                          theme === "dark" ? "text-sky-400" : "text-blue-700"
                        }`}>[{art.source || "News Source"}]</span>{" "}
                        <span className="hover:underline">{art.title}</span>
                      </div>
                      <ExternalLink size={10} className="mt-0.5 text-gray-400 shrink-0" />
                    </a>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Reading workflow controls */}
      <div className={`px-6 py-4 border-t flex items-center justify-between gap-3 ${
        theme === "dark" ? "bg-[#111726]/60 border-slate-800/80" : "bg-[#FAFBFB] border-gray-150"
      }`}>
        <button
          type="button"
          onClick={onMarkAsRead}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            isRead
              ? theme === "dark"
                ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                : "bg-emerald-50 border border-emerald-250 text-emerald-700"
              : theme === "dark"
                ? "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                : "bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200"
          }`}
        >
          <Check size={14} className={isRead ? "stroke-[3.5]" : ""} />
          <span>{isRead ? "Marked as Read" : "Mark as Read"}</span>
        </button>

        {hasNextStory && (
          <button
            type="button"
            onClick={onNextStory}
            className={`h-9 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer hover:underline ${
              theme === "dark" ? "text-sky-400" : "text-blue-600"
            }`}
          >
            <span>Next Story</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
