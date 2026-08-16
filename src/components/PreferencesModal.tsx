/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Check, X, Settings, Bell, AlertCircle, RefreshCw } from "lucide-react";
import { UserPreferences } from "../types";
import { motion } from "motion/react";
import {
  isPushNotificationSupported,
  getNotificationPermissionState,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications
} from "../utils/push";

interface PreferencesModalProps {
  preferences: UserPreferences;
  onSavePreferences: (updated: UserPreferences) => void;
  onClose: () => void;
  userEmail?: string;
  theme?: "dark" | "light";
}

export function PreferencesModal({
  preferences,
  onSavePreferences,
  onClose,
  userEmail = "default",
  theme = "dark"
}: PreferencesModalProps) {
  const isDark = theme === "dark";

  const [pushSupported, setPushSupported] = useState(true);
  const [permissionState, setPermissionState] = useState<NotificationPermission>("default");
  const [isUpdatingPush, setIsUpdatingPush] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  useEffect(() => {
    setPushSupported(isPushNotificationSupported());
    setPermissionState(getNotificationPermissionState());
  }, []);

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

  const handleToggleNotifications = async () => {
    if (!pushSupported) return;
    setIsUpdatingPush(true);
    setTestStatus(null);

    const isCurrentlyEnabled = preferences.notifications_enabled && permissionState === "granted";

    if (isCurrentlyEnabled) {
      // Turn off
      await unsubscribeFromPushNotifications(userEmail);
      const updated = { ...preferences, notifications_enabled: false };
      onSavePreferences(updated);
      setIsUpdatingPush(false);
    } else {
      // Turn on / Request permission
      const result = await subscribeToPushNotifications(userEmail);
      setPermissionState(getNotificationPermissionState());

      if (result.success) {
        const updated = { ...preferences, notifications_enabled: true };
        onSavePreferences(updated);
      } else {
        console.warn("[PreferencesModal] Notification subscription notice:", result.error);
      }
      setIsUpdatingPush(false);
    }
  };

  const handleSendTestNotification = async () => {
    setTestStatus("Sending...");
    try {
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail
        }
      });
      const data = await res.json();
      if (data.ok && data.sentCount > 0) {
        setTestStatus("Test alert sent!");
      } else {
        setTestStatus("Subscribed, but alert failed to dispatch (check VAPID keys).");
      }
    } catch {
      setTestStatus("Error triggering test alert.");
    }
    setTimeout(() => setTestStatus(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className={`w-full max-w-xl rounded-2xl border p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto ${
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
                Customize topics, briefing intervals, and desktop notifications.
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

        {/* Desktop Notifications Control */}
        <div className="space-y-3">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
            Desktop Notifications
          </h4>

          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              isDark ? "bg-[#0b0f1a] border-slate-800" : "bg-gray-50 border-gray-200"
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Bell size={15} className={preferences.notifications_enabled ? "text-cyan-400" : "text-slate-400"} />
                <span className="font-bold text-xs">Get notified when briefing is ready</span>
                {preferences.notifications_enabled && permissionState === "granted" && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    ON
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Delivers an alert to your desktop when the automated briefing cycle completes.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!pushSupported ? (
                <div className="flex items-center gap-1 text-amber-400 text-xs font-semibold">
                  <AlertCircle size={13} />
                  <span>Unsupported</span>
                </div>
              ) : permissionState === "denied" ? (
                <div className="text-right">
                  <span className="text-[11px] font-bold text-red-400 block">Blocked by Browser</span>
                  <span className="text-[9px] text-slate-400">Enable via address bar padlock</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleToggleNotifications}
                  disabled={isUpdatingPush}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                    preferences.notifications_enabled && permissionState === "granted"
                      ? "bg-slate-700 hover:bg-slate-600 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {isUpdatingPush ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : preferences.notifications_enabled && permissionState === "granted" ? (
                    "Turn Off"
                  ) : (
                    "Enable"
                  )}
                </button>
              )}
            </div>
          </div>

          {preferences.notifications_enabled && permissionState === "granted" && (
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-slate-400 text-[11px]">Verify desktop alert delivery:</span>
              <button
                type="button"
                onClick={handleSendTestNotification}
                className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
              >
                {testStatus || "Send Test Notification"}
              </button>
            </div>
          )}
        </div>

        {/* Topics Selection */}
        <div className="space-y-3 pt-2 border-t border-slate-800/40">
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
