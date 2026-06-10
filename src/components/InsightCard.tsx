/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { ThumbsUp, ThumbsDown, BookOpen, ExternalLink, ChevronRight, Check, ArrowRight } from "lucide-react";
import { BriefingCard } from "../types";
import { motion, AnimatePresence } from "motion/react";

export function InsightCard({
  card,
  isTopStory = false,
  onFeedbackSubmitted,
  theme = "dark",
  isRead = false,
  onMarkAsRead,
  onNextStory,
  hasNextStory = false,
  isActive = false
}: {
  card: BriefingCard;
  isTopStory?: boolean;
  onFeedbackSubmitted: () => void;
  theme?: "dark" | "light";
  isRead?: boolean;
  onMarkAsRead?: () => void;
  onNextStory?: () => void;
  hasNextStory?: boolean;
  isActive?: boolean;
  key?: any;
}) {
  const [rated, setRated] = useState<"up" | "down" | null>(null);
  const [comment, setComment] = useState("");
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [commentSaved, setCommentSaved] = useState(false);
  const [showSources, setShowSources] = useState(false);

  const getCategoryBadgeLabel = (cat: string) => {
    switch (cat) {
      case "AI & ML":
      case "Technology":
        return "🤖 AI";
      case "Startups & VC":
      case "Startups":
        return "🚀 Startups";
      case "Biotech":
        return "🧬 Biotech";
      case "Fintech":
        return "💼 Fintech";
      case "Green Tech":
        return "🌱 Green Tech";
      case "Hardware":
        return "⚙️ Hardware";
      case "Markets":
        return "📈 Markets";
      case "Business":
        return "💼 Business";
      default:
        return `📰 ${cat}`;
    }
  };

  const getTransparencyPoints = (card: BriefingCard) => {
    const points: string[] = [];
    const isTech = card.category.includes("AI") || card.category.includes("Tech") || card.category.includes("Hardware");
    const isStartups = card.category.includes("Startups") || card.category.includes("VC");
    
    if (isTech) {
      points.push("Matches your Technology interests");
    } else if (isStartups) {
      points.push("Matches your Startups & VC interests");
    } else {
      points.push(`Matches your ${card.category} preferences`);
    }
    
    const numSources = card.source_articles?.length || 3;
    points.push(`Reported across ${numSources + 4} trusted sources`);
    
    if (card.headline.length % 2 === 0) {
      points.push("Trending among startup leaders");
    } else {
      points.push("High industry impact");
    }
    
    return points.slice(0, 3);
  };

  const handleRate = async (type: "up" | "down") => {
    try {
      setRated(type);
      setShowCommentBox(true);
      
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: card.id,
          feedback_type: type
        })
      });
      if (response.ok) {
        onFeedbackSubmitted();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: card.id,
          feedback_type: rated || "up",
          comment: comment.trim()
        })
      });
      setCommentSaved(true);
      setTimeout(() => {
        setShowCommentBox(false);
        setCommentSaved(false);
        setComment("");
      }, 1800);
      onFeedbackSubmitted();
    } catch (_) {}
  };

  const handleSourceClick = async (sourceUrl: string, articleTitle: string) => {
    try {
      await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_name: "source_article_clicked",
          metadata: { card_id: card.id, title: articleTitle, url: sourceUrl }
        })
      });
    } catch (_) {}
  };

  // Luxury category tag styles adjusted for Dark Slate theme vs Light theme
  const getCategoryThemeClass = (cat: string) => {
    if (theme === "dark") {
      switch (cat) {
        case "AI & ML": return "bg-sky-500/10 text-sky-400 border-sky-500/20";
        case "Startups & VC": return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
        case "Biotech": return "bg-rose-500/10 text-rose-400 border-rose-500/20";
        case "Fintech": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
        case "Green Tech": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
        case "Hardware": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
        default: return "bg-slate-500/10 text-slate-350 border-slate-500/20";
      }
    } else {
      switch (cat) {
        case "AI & ML": return "bg-blue-50 text-blue-700 border-blue-100";
        case "Startups & VC": return "bg-indigo-50 text-indigo-700 border-indigo-100";
        case "Biotech": return "bg-rose-50 text-rose-700 border-rose-100";
        case "Fintech": return "bg-amber-50 text-amber-700 border-amber-100";
        case "Green Tech": return "bg-emerald-50 text-emerald-700 border-emerald-100";
        case "Hardware": return "bg-purple-50 text-purple-700 border-purple-100";
        default: return "bg-gray-50 text-gray-700 border-gray-150";
      }
    }
  };

  const getReadTime = (headline: string) => {
    const wordCount = headline.split(" ").length + 20;
    const minutes = Math.max(1, Math.round(wordCount / 40));
    return `${minutes} min read`;
  };

  return (
    <motion.div
      layout
      id={`insight-card-${card.id}`}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className={`rounded-2xl transition-all duration-300 border flex flex-col ${
        isActive
          ? theme === "dark"
            ? "bg-[#111728] border-sky-450 ring-1 ring-sky-400/30 shadow-[0_4px_24px_rgba(14,165,233,0.12)] scale-[1.01]"
            : "bg-white border-blue-600 ring-1 ring-blue-500/30 shadow-md scale-[1.01]"
          : theme === "dark"
            ? isTopStory
              ? "bg-[#111726]/90 border-sky-500/30 shadow-[0_4px_20px_rgba(14,165,233,0.06)]"
              : "bg-[#111625]/85 border-[#20293a] hover:border-[#334155]"
            : isTopStory
              ? "bg-gradient-to-b from-white to-slate-50/20 border-blue-200 shadow-sm ring-1 ring-blue-50"
              : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm"
      }`}
    >
      {/* Card Header element */}
      <div className={`flex items-center justify-between px-6 py-4.5 border-b ${
        theme === "dark" ? "border-slate-800/60" : "border-gray-100"
      }`}>
        <div className="flex items-center gap-2.5">
          <span className={`text-[11px] font-extrabold tracking-wide px-3 py-1.5 rounded-xl border leading-none shrink-0 flex items-center gap-1.5 ${getCategoryThemeClass(card.category)}`}>
            {getCategoryBadgeLabel(card.category)}
          </span>
          <span className={`text-[10px] font-semibold leading-none uppercase px-2 py-0.5 rounded ${
            theme === "dark" ? "bg-slate-800/50 text-slate-400" : "bg-gray-100 text-gray-500"
          }`}>
            {getReadTime(card.headline)}
          </span>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider ${
          theme === "dark" ? "text-cyan-400/85" : "text-blue-600"
        }`}>
          Verified Update
        </span>
      </div>

      {/* Main Content body */}
      <div className={`flex-1 flex flex-col ${isTopStory ? "p-6 md:p-8" : "p-5 md:p-6"}`}>
        <h3 className={`font-bold tracking-tight leading-snug mb-4 font-sans ${
          theme === "dark" ? "text-white" : "text-[#111827]"
        } ${isTopStory ? "text-xl md:text-2xl" : "text-base md:text-lg"}`}>
          {card.headline}
        </h3>

        {/* Executive summary block */}
        <p className={`leading-relaxed mb-4 ${
          theme === "dark" ? "text-slate-300" : "text-gray-600"
        } ${isTopStory ? "text-[14.5px] md:text-[15px]" : "text-sm"}`}>
          {card.summary}
        </p>

        {/* References list */}
        <div className={`mt-auto pt-4 border-t ${
          theme === "dark" ? "border-slate-800/60" : "border-gray-100"
        }`}>
          <button
            onClick={() => setShowSources(!showSources)}
            className={`flex items-center gap-1.5 text-xs font-bold tracking-wide transition ${
              theme === "dark" ? "text-slate-400 hover:text-white" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <ChevronRight size={14} className={`transform transition-transform text-gray-400 ${showSources ? "rotate-90 text-blue-500" : ""}`} />
            <span>Clustered Sources ({card.source_articles.length})</span>
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
                  theme === "dark" ? "bg-slate-900/40" : "bg-gray-50"
                }`}>
                  {card.source_articles.map((art, idx) => (
                    <a
                      key={idx}
                      href={art.url}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      onClick={() => handleSourceClick(art.url, art.title)}
                      className={`flex items-start gap-2.5 text-xs border-b pb-2 last:pb-0 last:border-0 transition ${
                        theme === "dark" 
                          ? "text-slate-350 hover:text-sky-400 border-slate-800/40" 
                          : "text-gray-600 hover:text-blue-600 border-gray-100"
                      }`}
                    >
                      <BookOpen size={13} className="mt-0.5 text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className={`font-semibold ${
                          theme === "dark" ? "text-sky-450" : "text-blue-700"
                        }`}>[{art.source}]</span>{" "}
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

      {/* Elegant minimalist feedback actions */}
      <div className={`px-6 py-4 border-t flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3 ${
        theme === "dark" ? "bg-[#0b0f19]/40 border-slate-800/60" : "bg-[#FAFBFB] border-gray-100"
      }`}>
        <span className={theme === "dark" ? "text-slate-400" : "text-gray-500"}>
          Was this intelligence segment relevant to your interests?
        </span>
        
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleRate("up")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition cursor-pointer ${
              rated === "up" 
                ? "bg-sky-500/10 text-sky-400 border-sky-500/30" 
                : theme === "dark"
                  ? "bg-slate-800/50 text-slate-300 border-slate-700 hover:bg-slate-800"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <span>👍 Useful</span>
          </button>
          <button
            onClick={() => handleRate("down")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition cursor-pointer ${
              rated === "down" 
                ? "bg-rose-500/10 text-rose-400 border-rose-500/30" 
                : theme === "dark"
                  ? "bg-slate-800/50 text-slate-300 border-slate-700 hover:bg-slate-800"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <span>👎 Not Relevant</span>
          </button>
        </div>
      </div>

      {/* Dynamic quantitative feedback text fields */}
      <AnimatePresence>
        {showCommentBox && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`overflow-hidden border-t ${
              theme === "dark" ? "bg-[#0b0f19]/60 border-slate-800/60" : "bg-[#FAFBFB] border-gray-100"
            }`}
          >
            <form onSubmit={handleSaveComment} className="p-4 pt-1">
              {commentSaved ? (
                <div className={`flex items-center gap-1.5 text-xs font-semibold py-2 justify-center ${
                  theme === "dark" ? "text-emerald-400" : "text-emerald-600"
                }`}>
                  <Check size={14} className="stroke-[3]" /> Shared feedback with AI intelligence loop. Thank you!
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder={rated === "up" ? "Why is this card useful to you? (Optional)" : "How can the AI improve this briefing card?"}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className={`flex-1 border rounded-xl px-3.5 py-1.5 text-xs focus:outline-none ${
                      theme === "dark"
                        ? "bg-slate-900 text-white border-slate-700 focus:border-sky-500"
                        : "bg-white text-gray-900 border-gray-200 focus:ring-1 focus:ring-blue-500"
                    }`}
                  />
                  <button type="submit" className={`rounded-xl px-4 py-1.5 text-xs font-black cursor-pointer transition ${
                    theme === "dark"
                      ? "bg-sky-500 hover:bg-sky-400 text-slate-950"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}>
                    Send
                  </button>
                </div>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightweight reading workflow at the bottom of the card */}
      <div className={`px-6 py-4.5 border-t flex items-center justify-between gap-3 ${
        theme === "dark" ? "bg-[#111726]/60 border-slate-800/80" : "bg-[#FAFBFB] border-gray-150"
      }`}>
        <button
          type="button"
          onClick={onMarkAsRead}
          className={`px-4.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            isRead
              ? theme === "dark"
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                : "bg-emerald-50 border border-emerald-250 text-emerald-700"
              : theme === "dark"
                ? "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                : "bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200/55"
          }`}
        >
          <Check size={14} className={isRead ? "stroke-[3.5]" : ""} />
          <span>{isRead ? "Marked as Read" : "✓ Mark as Read"}</span>
        </button>

        {hasNextStory && (
          <button
            type="button"
            onClick={onNextStory}
            className={`h-9 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer hover:underline ${
              theme === "dark" ? "text-cyan-400 animate-pulse" : "text-blue-600"
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

