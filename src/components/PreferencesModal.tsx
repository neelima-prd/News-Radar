/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Check, X, Settings } from "lucide-react";
import { UserPreferences } from "../types";
import { motion } from "motion/react";

interface PreferencesModalProps {
  preferences: UserPreferences;
  onSavePreferences: (updated: UserPreferences) => void;
  onClose: () => void;
  theme?: "dark" | "light";
}

export function PreferencesModal({
  preferences,
  onSavePreferences,
  onClose,
  theme = "dark"
}: PreferencesModalProps) {
  const isDark = theme === "dark";

  const availableTopics = [
    { id: "technology", label: "Technology", active: true },
    { id: "startups", label: "Startups", active: true },
    { id: "ai_ml", label: "AI & Machine Learning", active: false, comingSoon: true },
    { id: "india_biz", label: "India Business & Technology", active: false, comingSoon: true },
    { id: "business", label: "Business", active: false, comingSoon: true },
    { id: "markets", label: "Markets", active: false, comingSoon: true }
  ];

  const handleTopicToggle = (topicId: string) => {
    const currentTopics = preferences?.topics || [];
    let updatedTopics: string[];
    if (currentTopics.includes(topicId)) {
      if (currentTopics.length <= 1) return; // Maintain at least one topic
      updatedTopics = currentTopics.filter((t) => t !== topicId);
    } else {
      updatedTopics = [...currentTopics, topicId];
    }
    const updated = { ...preferences, topics: updatedTopics };
    onSavePreferences(updated);
  };

  const handleFrequencyChange = (freqHours: number) => {
    const updated = {
      ...preferences,
      briefing_frequency_hours: freqHours as 3 | 6 | 12 | 24
    };
    onSavePreferences(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className={`w-full max-w-xl rounded-2xl border p-6 shadow-2xl space-y-6 ${
          isDark
            ? "bg-[#101622] border-slate-800 text-slate-100"
            : "bg-white border-gray-200 text-gray-900"
        }`}
      >
        <div className="flex items-center justify-between border-b pb-4 border-slate-800/40 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <Settings size={18} className="text-cyan-400 shrink-0" />
            <div>
              <h3 className="font-bold text-base">Briefing Preferences</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Customize topics and automated briefing intervals.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Topics Selection */}
        <div className="space-y-3">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
            Topics You Follow
          </h4>
          <div className="flex flex-wrap gap-2">
            {availableTopics.map((topic) => {
              const isSelected = preferences?.topics?.includes(topic.id);

              if (topic.comingSoon) {
                return (
                  <div
                    key={topic.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium cursor-not-allowed select-none opacity-50 ${
                      isDark
                        ? "bg-slate-900/40 border-slate-800 text-slate-500"
                        : "bg-gray-50 border-gray-200 text-gray-400"
                    }`}
                  >
                    <span>{topic.label}</span>
                    <span
                      className={`text-[8px] font-bold px-1 rounded uppercase ${
                        isDark ? "bg-slate-800 text-slate-400" : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      Soon
                    </span>
                  </div>
                );
              }

              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => handleTopicToggle(topic.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold tracking-wide transition cursor-pointer ${
                    isSelected
                      ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                      : isDark
                        ? "bg-slate-850 border-slate-700 text-slate-400 hover:text-white"
                        : "bg-white hover:bg-gray-50 text-gray-600 border-gray-200"
                  }`}
                >
                  <span>{topic.label}</span>
                  {isSelected && <Check size={12} className="stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Briefing Frequency */}
        <div className="space-y-3 pt-2 border-t border-slate-800/40">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
            Briefing Frequency
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { hours: 3, label: "Every 3 hours" },
              { hours: 6, label: "Every 6 hours", recommended: true },
              { hours: 12, label: "Every 12 hours" },
              { hours: 24, label: "Once a day" }
            ].map((item) => {
              const isSelected =
                (preferences?.briefing_frequency_hours || 6) === item.hours;
              return (
                <button
                  key={item.hours}
                  type="button"
                  onClick={() => handleFrequencyChange(item.hours)}
                  className={`relative p-3 rounded-xl border text-xs font-bold transition text-center cursor-pointer ${
                    isSelected
                      ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                      : isDark
                        ? "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                        : "bg-white hover:bg-gray-50 border-gray-200 text-gray-700"
                  }`}
                >
                  <div>{item.label}</div>
                  {item.recommended && (
                    <span
                      className={`block text-[8px] font-black uppercase mt-1 tracking-wider ${
                        isSelected ? "text-blue-100" : "text-cyan-400"
                      }`}
                    >
                      Recommended
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}
