/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Check, ArrowRight, RotateCcw, Bell, AlertCircle, Sparkles } from "lucide-react";
import { motion } from "motion/react";

interface BriefingCompletionViewProps {
  nextBriefingTime: string;
  onBrowseArchive: () => void;
  onReviewAgain: () => void;
  isNotificationActive?: boolean;
  isNotificationBlocked?: boolean;
  isNotificationUnsupported?: boolean;
  notificationError?: string | null;
  onEnableNotifications?: () => void;
  loadingNotification?: boolean;
  theme?: "dark" | "light";
}

export function BriefingCompletionView({
  nextBriefingTime,
  onBrowseArchive,
  onReviewAgain,
  isNotificationActive = false,
  isNotificationBlocked = false,
  isNotificationUnsupported = false,
  notificationError = null,
  onEnableNotifications,
  loadingNotification = false,
  theme = "dark"
}: BriefingCompletionViewProps) {
  const isDark = theme === "dark";

  return (
    <motion.div
      initial={{ scale: 0.98, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`border rounded-2xl p-8 md:p-10 text-center space-y-6 shadow-xl max-w-xl mx-auto my-4 transition-colors ${
        isDark
          ? "bg-gradient-to-br from-[#10192e] to-[#0d1323] border-emerald-500/30 text-white"
          : "bg-gradient-to-br from-emerald-50/40 to-white border-emerald-200 text-gray-900 shadow-sm"
      }`}
    >
      <div className="flex flex-col items-center">
        <div
          className={`h-14 w-14 rounded-full flex items-center justify-center mb-4 ${
            isDark
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "bg-emerald-100 text-emerald-700 border border-emerald-200"
          }`}
        >
          <Check size={28} className="stroke-[3]" />
        </div>
        <h2 className="text-2xl md:text-3xl font-black tracking-tight">
          Briefing Complete
        </h2>
        <p
          className={`text-sm md:text-base font-medium mt-1.5 ${
            isDark ? "text-slate-300" : "text-gray-600"
          }`}
        >
          You&apos;re all caught up.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div
          className={`inline-flex flex-col items-center px-6 py-3 rounded-2xl border ${
            isDark
              ? "bg-[#0b0f1a]/80 border-slate-800"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
            Next Briefing
          </span>
          <span
            className={`text-lg font-extrabold mt-0.5 ${
              isDark ? "text-cyan-400" : "text-blue-600"
            }`}
          >
            {nextBriefingTime}
          </span>
        </div>

        {/* NOTIFICATION STATUS & LIFECYCLE CONTROLS */}
        {isNotificationActive ? (
          /* CASE A — Notifications Already Active */
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border ${
              isDark
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
            }`}
          >
            <Check size={14} className="stroke-[3] text-emerald-400 shrink-0" />
            <span>You&apos;ll be notified when your next briefing is ready</span>
          </div>
        ) : isNotificationBlocked ? (
          /* CASE C — Blocked by Browser */
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium border ${
              isDark
                ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                : "bg-rose-50 border-rose-200 text-rose-700"
            }`}
          >
            <AlertCircle size={13} className="shrink-0 text-rose-400" />
            <span>Notifications blocked — enable in site settings</span>
          </div>
        ) : isNotificationUnsupported ? (
          /* CASE D — Unsupported */
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium border ${
              isDark
                ? "bg-slate-800/40 border-slate-700/50 text-slate-400"
                : "bg-gray-100 border-gray-200 text-gray-600"
            }`}
          >
            <span>Web Push not supported in this browser</span>
          </div>
        ) : onEnableNotifications ? (
          /* CASE B — Available to Enable */
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onEnableNotifications}
              disabled={loadingNotification}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                isDark
                  ? "bg-cyan-950/40 border-cyan-800/60 text-cyan-300 hover:bg-cyan-900/50 hover:border-cyan-700"
                  : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300"
              } disabled:opacity-50`}
            >
              {loadingNotification ? (
                <>
                  <Sparkles size={13} className="animate-spin text-cyan-400" />
                  <span>Enabling notifications...</span>
                </>
              ) : (
                <>
                  <Bell size={13} className="text-cyan-400 animate-pulse" />
                  <span>{notificationError ? "Retry Notification Setup" : "Notify me when next briefing arrives"}</span>
                </>
              )}
            </button>
            {notificationError && (
              <p className="text-[11px] text-rose-400 font-medium max-w-xs text-center">
                {notificationError}
              </p>
            )}
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={onBrowseArchive}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md cursor-pointer"
        >
          <span>Browse Archive</span>
          <ArrowRight size={14} />
        </button>

        <button
          type="button"
          onClick={onReviewAgain}
          className={`px-5 py-3 rounded-xl text-xs font-bold transition border cursor-pointer flex items-center gap-2 ${
            isDark
              ? "bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-slate-200"
              : "bg-white border-gray-200 hover:bg-gray-50 text-gray-800 shadow-sm"
          }`}
        >
          <RotateCcw size={14} />
          <span>Review Again</span>
        </button>
      </div>
    </motion.div>
  );
}
