/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { ThumbsUp, ThumbsDown, BookOpen, ExternalLink, ChevronRight, Check } from "lucide-react";
import { BriefingCard } from "../types";
import { motion, AnimatePresence } from "motion/react";

export function InsightCard({
  card,
  isTopStory = false,
  onFeedbackSubmitted
}: {
  card: BriefingCard;
  isTopStory?: boolean;
  onFeedbackSubmitted: () => void;
  key?: string | number;
}) {
  const [rated, setRated] = useState<"up" | "down" | null>(null);
  const [comment, setComment] = useState("");
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [commentSaved, setCommentSaved] = useState(false);
  const [showSources, setShowSources] = useState(false);

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

  // Re-designed luxury category label tags (calm, high contrast, clean)
  const categoryStyles: Record<string, string> = {
    "AI & ML": "bg-blue-50 text-blue-700 border-blue-100",
    "Startups & VC": "bg-indigo-50 text-indigo-700 border-indigo-100",
    "Biotech": "bg-rose-50 text-rose-700 border-rose-100",
    "Fintech": "bg-amber-50 text-amber-700 border-amber-100",
    "Green Tech": "bg-emerald-50 text-emerald-700 border-emerald-100",
    "Hardware": "bg-purple-50 text-purple-700 border-purple-100",
    "SaaS": "bg-sky-50 text-sky-700 border-sky-100"
  };

  const defaultCategoryStyle = "bg-gray-50 text-gray-700 border-gray-150";

  return (
    <motion.div
      layout
      id={`insight-card-${card.id}`}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className={`bg-white border text-[#111827] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col transition-all hover:border-gray-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)] ${
        isTopStory 
          ? "border-blue-200 ring-1 ring-blue-50 bg-gradient-to-b from-white to-slate-50/20" 
          : "border-gray-200"
      }`}
    >
      {/* Header element */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          {isTopStory && (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 border border-amber-100 text-amber-800">
              🔥 Top Story
            </span>
          )}
          <span className={`text-[11px] font-semibold tracking-wide uppercase px-2.5 py-0.5 rounded-full border ${categoryStyles[card.category] || defaultCategoryStyle}`}>
            {card.category}
          </span>
        </div>
        <span className="text-[11px] text-gray-400 font-medium">Verified Update</span>
      </div>

      {/* Main Content body */}
      <div className={`flex-1 flex flex-col ${isTopStory ? "p-7 md:p-8" : "p-6"}`}>
        <h3 className={`text-[#111827] font-bold tracking-tight leading-snug mb-3.5 ${isTopStory ? "text-xl md:text-2xl" : "text-base md:text-lg"}`}>
          {card.headline}
        </h3>

        {/* Executive summary block */}
        <p className={`text-[#4B5563] leading-relaxed mb-5 ${isTopStory ? "text-base" : "text-sm"}`}>
          {card.summary}
        </p>

        {/* Re-designed elegant "Why it Matters" highlight block */}
        <div className="border-l-3 border-blue-600 bg-slate-50/80 p-4 rounded-r-xl mb-5">
          <h4 className="text-[11px] font-bold tracking-wider text-blue-700 uppercase mb-1">
            Why It Matters
          </h4>
          <p className="text-sm text-gray-700 leading-relaxed">
            {card.why_it_matters}
          </p>
        </div>

        {/* References list */}
        <div className="mt-auto pt-4 border-t border-gray-100">
          <button
            onClick={() => setShowSources(!showSources)}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition"
          >
            <ChevronRight size={14} className={`transform transition-transform text-gray-400 ${showSources ? "rotate-90 text-blue-600" : ""}`} />
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
                <div className="bg-gray-50 rounded-xl p-3.5 space-y-2 text-xs">
                  {card.source_articles.map((art, idx) => (
                    <a
                      key={idx}
                      href={art.url}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      onClick={() => handleSourceClick(art.url, art.title)}
                      className="flex items-start gap-2.5 text-gray-600 hover:text-blue-600 font-sans text-xs border-b border-gray-100 last:border-0 pb-2 last:pb-0 transition"
                    >
                      <BookOpen size={13} className="mt-0.5 text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-blue-700">[{art.source}]</span>{" "}
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

      {/* Elegant minimalist feedback actions - matching standard design patterns */}
      <div className="bg-[#FAFBFB] px-6 py-4.5 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3">
        <span className="text-gray-500 font-medium">Was this intelligence segment relevant to your interests?</span>
        
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleRate("up")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition cursor-pointer ${
              rated === "up" 
                ? "bg-blue-50 text-blue-700 border-blue-200 font-semibold" 
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <span>👍 Useful</span>
          </button>
          <button
            onClick={() => handleRate("down")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition cursor-pointer ${
              rated === "down" 
                ? "bg-red-50 text-red-700 border-red-200 font-semibold" 
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
            className="overflow-hidden bg-[#FAFBFB] border-t border-gray-100"
          >
            <form onSubmit={handleSaveComment} className="p-4 pt-1">
              {commentSaved ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold py-2 justify-center">
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
                    className="flex-1 bg-white border border-gray-200 rounded-xl px-3.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-1.5 text-xs font-semibold cursor-pointer transition">
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
