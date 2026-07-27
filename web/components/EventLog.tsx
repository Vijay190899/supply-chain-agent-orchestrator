"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { AgentId } from "@/lib/types";

export type LogLine = { id: number; agent: AgentId | "system"; text: string };

const TAG: Record<string, string> = {
  monitor: "RADAR",
  optimizer: "PLAN",
  human_approval: "AUTH",
  communicator: "NOTICE",
  system: "SYS",
};

const TAG_COLOR: Record<string, string> = {
  human_approval: "var(--color-cyan)",
  system: "var(--color-faint)",
};

export function EventLog({ lines, live }: { lines: LogLine[]; live: boolean }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [lines]);

  return (
    <div className="panel flex h-full min-h-[260px] flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="kicker">notice feed</span>
        <span className="telemetry flex items-center gap-1.5 text-[10px] text-[var(--color-faint)]">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: live ? "var(--color-amber)" : "var(--color-faint)" }}
          />
          {live ? "LIVE" : "IDLE"} · {String(lines.length).padStart(2, "0")}
        </span>
      </div>
      <div className="mx-3 border-t border-[var(--color-hair)]" />
      <div className="thin-scroll flex-1 overflow-y-auto px-3 py-2.5 text-[12px] leading-[1.7]">
        {lines.length === 0 ? (
          <p className="telemetry text-[var(--color-faint)]">standby · awaiting tasking</p>
        ) : (
          lines.map((line, i) => (
            <motion.div
              key={line.id}
              initial={{ opacity: 0, y: 4, x: -3 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              transition={{ duration: 0.2, ease: [0.0, 0.0, 0.2, 1] }}
              className="telemetry flex gap-2.5"
            >
              <span className="w-5 shrink-0 text-right text-[var(--color-faint)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className="w-14 shrink-0"
                style={{ color: TAG_COLOR[line.agent] ?? "var(--color-muted)" }}
              >
                {TAG[line.agent]}
              </span>
              <span className="min-w-0 flex-1 text-[var(--color-text)]/85">{line.text}</span>
            </motion.div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
