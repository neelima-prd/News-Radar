/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { ThumbsUp, ThumbsDown, BookOpen, ExternalLink, HelpCircle, ChevronRight, Check } from "lucide-react";
import { BriefingCard } from "../types";
import { motion, AnimatePresence } from "motion/react";

export function InsightCard({
  card,
  onFeedbackSubmitted
}: {
  card: BriefingCard;
  onFeedbackSubmitted: () => void;
  key?: string;
}) {
  const [rated, setRated] = useState<"up" | "down" | null>(null);
  const [comment, setComment] = useState("");
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [commentSaved, setCommentSaved] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);

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

  // Assign distinct warm tint depending on category
  const categoryStyles: Record<string, string> = {
    "AI & ML": "bg-emerald-50 text-emerald-700 border-emerald-100",
    "Startups & VC": "bg-indigo-50 text-indigo-700 border-indigo-100",
    "Biotech": "bg-rose-50 text-rose-700 border-rose-100",
    "Fintech": "bg-amber-50 text-amber-700 border-amber-100",
    "Green Tech": "bg-teal-50 text-teal-700 border-tea-100",
    "Hardware": "bg-purple-50 text-purple-700 border-purple-100",
    "SaaS": "bg-blue-50 text-blue-700 border-blue-100"
  };

  const defaultCategoryStyle = "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <motion.div
      layout
      id={`insight-card-${card.id}`}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:border-slate-350 transition-colors"
    >
      {/* Top indicator bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full border ${categoryStyles[card.category] || defaultCategoryStyle}`}>
            {card.category}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">DEDUPLICATED</span>
        </div>

        {/* Priority Score metrics trigger */}
        <div className="relative">
          <button
            onClick={() => setShowScoreBreakdown(!showScoreBreakdown)}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200/80 transition text-[11px] font-mono font-bold text-slate-700"
          >
            <span>Priority Score:</span>
            <span className="text-indigo-600">{card.score}</span>
          </button>

          <AnimatePresence>
            {showScoreBreakdown && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute right-0 mt-1.5 w-60 bg-white border border-slate-200 shadow-lg rounded-lg p-3.5 z-20 font-mono text-[10px]"
              >
                <div className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 mb-2 flex items-center justify-between">
                  <span>Score Weighting</span>
                  <span>40 - 40 - 20</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-500">Relevance (40%)</span>
                      <span className="font-semibold text-slate-700">{card.relevance}/100</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full" style={{ width: `${card.relevance}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-500">Importance (40%)</span>
                      <span className="font-semibold text-slate-700">{card.importance}/100</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full" style={{ width: `${card.importance}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-500">Popularity (20%)</span>
                      <span className="font-semibold text-slate-700">{card.popularity}/100</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full" style={{ width: `${card.popularity}%` }}></div>
                    </div>
                  </div>
                </div>
                <p className="mt-2.5 text-[9px] text-slate-400 leading-snug border-t border-slate-50 pt-2">
                  * Weighted formula matches standard product validation models perfectly.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-base font-medium text-slate-900 tracking-tight leading-snug mb-3">
          {card.headline}
        </h3>

        {/* 2-3 Line Summary */}
        <p className="text-xs text-slate-600 leading-relaxed mb-4">
          {card.summary}
        </p>

        {/* Why it matters block */}
        <div className="bg-slate-50 border-l-[3px] border-indigo-500 p-3.5 rounded-r-lg mb-4">
          <h4 className="text-[10px] font-mono font-bold tracking-wider text-indigo-700 uppercase mb-1">
            Why It Matters
          </h4>
          <p className="text-xs text-slate-700 leading-relaxed">
            {card.why_it_matters}
          </p>
        </div>

        {/* Original Clustered Sources */}
        <div className="mt-auto border-t border-slate-100 pt-4">
          <button
            onClick={() => setShowSources(!showSources)}
            className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-mono font-bold text-slate-500 hover:text-slate-800 transition"
          >
            <ChevronRight size={12} className={`transform transition-transform ${showSources ? "rotate-90 text-indigo-500" : ""}`} />
            <span>Clustered Sources ({card.source_articles.length})</span>
          </button>

          <AnimatePresence>
            {showSources && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-2"
              >
                <div className="bg-slate-50 rounded-lg p-3 space-y-2 text-xs">
                  {card.source_articles.map((art, idx) => (
                    <a
                      key={idx}
                      href={art.url}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      onClick={() => handleSourceClick(art.url, art.title)}
                      className="flex items-start gap-2 text-slate-600 hover:text-indigo-600 font-mono text-[10px] border-b border-slate-100 last:border-0 pb-1.5 last:pb-0 transition"
                    >
                      <BookOpen size={10} className="mt-1 text-slate-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-indigo-700">[{art.source}]</span>{" "}
                        <span className="hover:underline">{art.title}</span>
                      </div>
                      <ExternalLink size={8} className="mt-1 text-slate-400 shrink-0" />
                    </a>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer / Feedback collection */}
      <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-[10px] font-mono text-slate-400">Did this insight save you search time?</span>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleRate("up")}
            className={`p-1.5 rounded-full border transition ${
              rated === "up" 
                ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                : "bg-white text-slate-500 hover:text-slate-800 border-slate-200"
            }`}
          >
            <ThumbsUp size={12} />
          </button>
          <button
            onClick={() => handleRate("down")}
            className={`p-1.5 rounded-full border transition ${
              rated === "down" 
                ? "bg-rose-50 text-rose-600 border-rose-200" 
                : "bg-white text-slate-500 hover:text-slate-800 border-slate-200"
            }`}
          >
            <ThumbsDown size={12} />
          </button>
        </div>
      </div>

      {/* Quick qualitative feedback text field */}
      <AnimatePresence>
        {showCommentBox && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-slate-50/50 border-t border-slate-100"
          >
            <form onSubmit={handleSaveComment} className="p-3">
              {commentSaved ? (
                <div className="flex items-center gap-2 text-[11px] text-emerald-600 font-medium py-1 justify-center">
                  <Check size={14} /> Shared feedback with AI intelligence loop. Thank you!
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder={rated === "up" ? "Why is this card useful to you? (Optional)" : "How can the AI improve this briefing card?"}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500"
                  />
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded px-3 py-1 text-xs font-medium cursor-pointer transition">
                    Send
                  </button>
                </div>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
