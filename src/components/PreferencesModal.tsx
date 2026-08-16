/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Check, X, Settings, Bell, AlertCircle, RefreshCw, BellOff, ShieldAlert } from "lucide-react";
import { UserPreferences } from "../types";
import { motion } from "motion/react";
import {
  isPushNotificationSupported,
  getNotificationPermissionState,
  getActivePushSubscription,
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
  const [hasSubscription, setHasSubscription] = useState(false);
  const [isUpdatingPush, setIsUpdatingPush] = useState(false);

  // Synchronize browser notification & push subscription states
  useEffect(() => {
    let isMounted = true;

    const verifyState = async () => {
      const supported = isPushNotificationSupported();
      const permission = getNotificationPermissionState();

      if (!isMounted) return;
      setPushSupported(supported);
      setPermissionState(permission);

      if (supported && permission === "granted") {
        const sub = await getActivePushSubscription();
        if (!isMounted) return;
        setHasSubscription(!!sub);

        // Auto-recover subscription if user preferences say enabled but device sub missing
        if (preferences.notifications_enabled && !sub) {
          try {
            const recovery = await subscribeToPushNotifications(userEmail);
            if (recovery.success && isMounted) {
              setHasSubscription(true);
            }
          } catch (e) {
            console.warn("[PreferencesModal] Auto-recovery failed:", e);
          }
        }
      } else {
        setHasSubscription(false);
      }
    };

    verifyState();

    return () => {
      isMounted = false;
    };
  }, [preferences.notifications_enabled, userEmail]);

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
    const updated: UserPreferences = { ...preferences, topics: updatedTopics };
    onSavePreferences(updated);
  };

  const handleFrequencyChange = (freqHours: number) => {
    const updated: UserPreferences = {
      ...preferences,
      briefing_frequency_hours: freqHours as 3 | 6 | 12 | 24
    };
    onSavePreferences(updated);
  };

  // State calculations
  const isEnabled = preferences.notifications_enabled === true && permissionState === "granted" && hasSubscription;
  const isNeedsReconnect = preferences.notifications_enabled === true && permissionState === "granted" && !hasSubscription;
  const isBlocked = permissionState === "denied";

  const handleToggleNotifications = async () => {
    if (!pushSupported || isBlocked) return;
    setIsUpdatingPush(true);

    if (isEnabled) {
      // Disable Notifications
      try {
        await unsubscribeFromPushNotifications(userEmail);
        setHasSubscription(false);
        const updated: UserPreferences = { ...preferences, notifications_enabled: false };
        onSavePreferences(updated);
      } catch (err) {
        console.error("[PreferencesModal] Disable error:", err);
      } finally {
        setIsUpdatingPush(false);
      }
    } else {
      // Enable or Reconnect Notifications
      try {
        const result = await subscribeToPushNotifications(userEmail);
        const currentPerm = getNotificationPermissionState();
        setPermissionState(currentPerm);

        if (result.success) {
          setHasSubscription(true);
          const updated: UserPreferences = { ...preferences, notifications_enabled: true };
          onSavePreferences(updated);
        } else {
          setHasSubscription(false);
          console.warn("[PreferencesModal] Enable error notice:", result.error);
        }
      } catch (err) {
        console.error("[PreferencesModal] Enable error:", err);
      } finally {
        setIsUpdatingPush(false);
      }
    }
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
            aria-label="Close preferences"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Desktop Notifications Control Panel */}
        <div className="space-y-3">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
            Desktop Notifications
          </h4>

          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors ${
              isDark ? "bg-[#0b0f1a] border-slate-800" : "bg-gray-50 border-gray-200"
            }`}
          >
            <div className="space-y-1 pr-2">
              <div className="flex items-center gap-2">
                {isEnabled ? (
                  <Bell size={15} className="text-cyan-400" />
                ) : isBlocked ? (
                  <ShieldAlert size={15} className="text-red-400" />
                ) : isNeedsReconnect ? (
                  <AlertCircle size={15} className="text-amber-400" />
                ) : (
                  <BellOff size={15} className="text-slate-400" />
                )}

                <span className="font-bold text-xs">
                  {!pushSupported
                    ? "Desktop notifications unsupported"
                    : isBlocked
                    ? "Desktop notifications blocked by browser"
                    : isEnabled
                    ? "Desktop notifications enabled"
                    : isNeedsReconnect
                    ? "Notifications need to be reconnected"
                    : "Get notified when briefing is ready"}
                </span>

                {isEnabled && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    ON
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                {!pushSupported
                  ? "Web Push notifications are not supported in this browser."
                  : isBlocked
                  ? "Notifications are blocked in your browser settings. To enable, click the padlock/site settings icon in your address bar and set Notifications to Allow."
                  : isEnabled
                  ? "You'll be notified when your next intelligence briefing is ready."
                  : isNeedsReconnect
                  ? "Browser permission is granted, but your device push subscription is inactive or needs refreshing."
                  : "Delivers an alert to your desktop when the automated briefing cycle completes."}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              {!pushSupported ? (
                <div className="flex items-center gap-1 text-amber-400 text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle size={13} />
                  <span>Unsupported</span>
                </div>
              ) : isBlocked ? (
                <div className="text-right">
                  <span className="text-[11px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-lg inline-block">
                    Blocked in Browser
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleToggleNotifications}
                  disabled={isUpdatingPush}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50 ${
                    isEnabled
                      ? "bg-slate-700 hover:bg-slate-600 text-white"
                      : isNeedsReconnect
                      ? "bg-amber-600 hover:bg-amber-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {isUpdatingPush ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : isEnabled ? (
                    "Disable"
                  ) : isNeedsReconnect ? (
                    "Reconnect"
                  ) : (
                    "Enable"
                  )}
                </button>
              )}
            </div>
          </div>
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
