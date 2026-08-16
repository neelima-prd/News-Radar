/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Bell, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface NotificationPromptBannerProps {
  onEnable: () => void;
  onDismiss: () => void;
  loading?: boolean;
  theme?: "dark" | "light";
}

export function NotificationPromptBanner({
  onEnable,
  onDismiss,
  loading = false,
  theme = "dark"
}: NotificationPromptBannerProps) {
  const isDark = theme === "dark";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className={`w-full max-w-7xl mx-auto px-6 pt-4 pb-2`}
      >
        <div
          className={`rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg transition-colors ${
            isDark
              ? "bg-gradient-to-r from-[#101b33] via-[#0d1629] to-[#121422] border-cyan-500/30 text-slate-100 shadow-cyan-950/20"
              : "bg-gradient-to-r from-blue-50/80 via-white to-cyan-50/60 border-blue-200 text-gray-900 shadow-sm"
          }`}
        >
          <div className="flex items-start sm:items-center gap-3.5">
            <div
              className={`p-2.5 rounded-xl shrink-0 flex items-center justify-center ${
                isDark
                  ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                  : "bg-blue-100 text-blue-600 border border-blue-200"
              }`}
            >
              <Bell size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm tracking-tight">Never miss your briefing</h4>
                <span
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                    isDark ? "bg-cyan-950 text-cyan-300 border border-cyan-800" : "bg-blue-100 text-blue-700"
                  }`}
                >
                  Automated Loop
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                News Radar can notify you when your next intelligence briefing is ready.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={onDismiss}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                isDark
                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
              }`}
            >
              Maybe later
            </button>

            <button
              type="button"
              onClick={onEnable}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Sparkles size={13} />
              <span>{loading ? "Enabling..." : "Enable Notifications"}</span>
            </button>

            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss banner"
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                isDark ? "text-slate-400 hover:text-white" : "text-gray-400 hover:text-gray-700"
              }`}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
