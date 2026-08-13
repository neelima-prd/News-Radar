/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { History, Calendar, Sparkles } from "lucide-react";
import { Briefing } from "../types";
import { StoryQueue } from "./StoryQueue";
import { ActiveStoryPanel } from "./ActiveStoryPanel";

interface ArchivesWorkspaceProps {
  historicBriefings: Briefing[];
  readStoryIds: string[];
  onMarkAsRead: (cardId: string) => void | Promise<void>;
  theme?: "dark" | "light";
}

export function ArchivesWorkspace({
  historicBriefings,
  readStoryIds,
  onMarkAsRead,
  theme = "dark"
}: ArchivesWorkspaceProps) {
  const isDark = theme === "dark";

  const [selectedBriefingId, setSelectedBriefingId] = useState<string>(
    historicBriefings[0]?.id || ""
  );

  const currentBriefing =
    historicBriefings.find((b) => b.id === selectedBriefingId) ||
    historicBriefings[0] ||
    null;

  const [activeCardId, setActiveCardId] = useState<string>(
    currentBriefing?.cards?.[0]?.id || ""
  );

  // When selected briefing changes, set first story active
  const handleSelectBriefing = (briefingId: string) => {
    setSelectedBriefingId(briefingId);
    const target = historicBriefings.find((b) => b.id === briefingId);
    if (target?.cards?.[0]) {
      setActiveCardId(target.cards[0].id);
    }
  };

  const cards = currentBriefing?.cards || [];
  const activeCardIndex = cards.findIndex((c) => c.id === activeCardId);
  const activeCard = cards[activeCardIndex] || cards[0] || null;

  const handleNextStory = () => {
    if (activeCard) {
      onMarkAsRead(activeCard.id);
    }
    if (activeCardIndex >= 0 && activeCardIndex < cards.length - 1) {
      setActiveCardId(cards[activeCardIndex + 1].id);
    }
  };

  if (historicBriefings.length === 0) {
    return (
      <div
        className={`border border-dashed rounded-2xl p-12 text-center max-w-2xl mx-auto my-8 ${
          isDark
            ? "bg-[#0d121f] border-slate-800 text-slate-400"
            : "bg-white border-gray-200 text-gray-500"
        }`}
      >
        <History size={32} className="mx-auto mb-3 text-slate-500" />
        <h3 className="text-base font-bold text-slate-300">No Archives Yet</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Past briefings will appear here automatically as new intelligence briefs are generated over time.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full px-6 py-6">
      {/* Archive Selector Header */}
      <div
        className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isDark
            ? "bg-[#0f1524] border-slate-800 text-slate-200"
            : "bg-white border-gray-200 text-gray-800 shadow-sm"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
              isDark ? "bg-cyan-500/10 text-cyan-400" : "bg-blue-100 text-blue-700"
            }`}
          >
            <History size={18} />
          </div>
          <div>
            <h2 className="text-base font-black tracking-tight">
              Intelligence Archives
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select a historic briefing digest to review past coverage.
            </p>
          </div>
        </div>

        {/* Briefing Picker Dropdown */}
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-slate-400 shrink-0" />
          <select
            value={currentBriefing?.id || ""}
            onChange={(e) => handleSelectBriefing(e.target.value)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
              isDark
                ? "bg-[#162035] border-slate-700 text-white"
                : "bg-gray-50 border-gray-200 text-gray-800"
            }`}
          >
            {historicBriefings.map((brief, idx) => (
              <option key={brief.id} value={brief.id}>
                Digest #{historicBriefings.length - idx} (
                {new Date(brief.generated_at).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                })}
                ) — {brief.cards?.length || 0} Stories
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Archived Briefing Two-Column Workspace */}
      {currentBriefing && cards.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Story Queue (35% on desktop -> 4 cols out of 12) */}
          <div className="lg:col-span-4">
            <StoryQueue
              cards={cards}
              activeCardId={activeCardId}
              readStoryIds={readStoryIds}
              onSelectStory={(cardId) => setActiveCardId(cardId)}
              theme={theme}
            />
          </div>

          {/* Right: Active Story Panel (65% on desktop -> 8 cols out of 12) */}
          <div className="lg:col-span-8">
            {activeCard ? (
              <ActiveStoryPanel
                card={activeCard}
                isRead={readStoryIds.includes(activeCard.id)}
                onMarkAsRead={() => onMarkAsRead(activeCard.id)}
                onNextStory={handleNextStory}
                hasNextStory={activeCardIndex < cards.length - 1}
                theme={theme}
                storyIndex={activeCardIndex}
                totalStories={cards.length}
              />
            ) : (
              <div
                className={`border border-dashed rounded-2xl p-12 text-center ${
                  isDark ? "bg-[#0d121f] border-slate-800" : "bg-white border-gray-200"
                }`}
              >
                <Sparkles size={24} className="text-slate-500 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Select a story from the queue</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
