/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from "react";
import { Terminal, Shield, RefreshCw, Trash2 } from "lucide-react";
import { LiveRadarLog } from "../types";

export function LiveRadarLogs({ pollingTrigger }: { pollingTrigger: number }) {
  const [logs, setLogs] = useState<LiveRadarLog[]>([]);
  const [isLive, setIsLive] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    try {
      const response = await fetch("/api/logs");
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (e) {
      console.error("Failed to load background logs", e);
    }
  };

  useEffect(() => {
    fetchLogs();
    
    let intervalId: any;
    if (isLive) {
      intervalId = setInterval(fetchLogs, 1500);
    }
    return () => clearInterval(intervalId);
  }, [isLive, pollingTrigger]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const clearLogs = async () => {
    try {
      await fetch("/api/logs/clear", { method: "POST" });
      fetchLogs();
    } catch (_) {}
  };

  return (
    <div id="radar-logs" className="bg-slate-900 rounded-3xl border border-slate-800 p-5 font-mono text-xs shadow-inner flex flex-col h-60">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 text-slate-400">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-emerald-400 animate-pulse" />
          <span className="font-semibold text-slate-200">Radar Intelligence Log</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded transition ${
              isLive ? "bg-emerald-950/50 text-emerald-400 border border-emerald-900" : "bg-slate-800 text-slate-400"
            }`}
          >
            <RefreshCw size={10} className={isLive ? "animate-spin" : ""} />
            {isLive ? "Live" : "Paused"}
          </button>
          <button
            onClick={clearLogs}
            title="Clear logs"
            className="text-slate-500 hover:text-rose-400 transition"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-mono leading-relaxed text-slate-300">
        {logs.length === 0 ? (
          <div className="text-slate-600 italic py-2 text-center">No telemetry logs registered yet. Trigger a scan to sweep.</div>
        ) : (
          logs.map((log, idx) => {
            let color = "text-slate-400";
            if (log.type === "success") color = "text-emerald-400";
            if (log.type === "warning") color = "text-amber-400 font-medium";
            if (log.type === "error") color = "text-rose-400 font-semibold";

            const timeStr = new Date(log.timestamp).toLocaleTimeString();

            return (
              <div key={idx} className="flex gap-2 items-start py-0.5 border-b border-slate-950/20">
                <span className="text-slate-600 shrink-0 text-[10px] select-none">[{timeStr}]</span>
                <span className={color}>{log.message}</span>
              </div>
            );
          })
        )}
      </div>
      <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-800 pt-1.5">
        <span className="flex items-center gap-1">
          <Shield size={10} className="text-slate-400" /> Grounding Secure
        </span>
        <span>Gemini 3.5 Active</span>
      </div>
    </div>
  );
}
