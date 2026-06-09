/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { Activity, Radio, Key, Fingerprint } from "lucide-react";
import { AnalyticsEvent } from "../types";

export function AnalyticsPanel({ pollingTrigger }: { pollingTrigger: number }) {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);

  const fetchEvents = async () => {
    try {
      const response = await fetch("/api/analytics");
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 2000);
    return () => clearInterval(interval);
  }, [pollingTrigger]);

  return (
    <div id="analytics-panel" className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 text-slate-800">
          <Activity size={16} className="text-indigo-500" />
          <span className="font-semibold text-sm">PostHog Analytics Outflow</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
          <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping"></span>
          <span>SDK Connected</span>
        </div>
      </div>

      <p className="text-xs text-slate-500 mb-3 leading-relaxed">
        Live telemetry stream recording functional triggers. Each user interaction publishes standard structure payloads to the database.
      </p>

      <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
        {events.length === 0 ? (
          <div className="text-center text-slate-400 italic text-xs py-4">No events logged yet. Try browsing articles or submitting rating flags.</div>
        ) : (
          events.map((event) => (
            <div key={event.id} className="flex gap-2.5 items-start bg-slate-50 border border-slate-100 rounded p-2 text-[11px] font-mono select-all hover:bg-indigo-50/20 hover:border-slate-200 transition">
              <Fingerprint size={12} className="text-indigo-600 mt-1 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-700">{event.event_name}</span>
                  <span className="text-[9px] text-slate-400">
                    {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <div className="text-slate-500 bg-white/60 p-1.5 rounded border border-slate-100/50 max-h-24 overflow-x-auto text-[10px] break-all leading-normal whitespace-pre-wrap">
                  {JSON.stringify(event.metadata, null, 2)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
