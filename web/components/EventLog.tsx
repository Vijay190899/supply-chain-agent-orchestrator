"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { AgentId } from "@/lib/types";

export type LogLine = { id: number; agent: AgentId | "system"; text: string };

const TAG: Record<string, string> = {
  monitor: "monitor",
  optimizer: "optimizer",
  human_approval: "approval",
  communicator: "notice",
  system: "system",
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
    <div className="glass flex h-full min-h-[280px] flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="kicker">live feed</span>
        <span className="mono flex items-center gap-1.5 text-[10px] text-[var(--color-faint)]">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: live ? "var(--color-warm)" : "var(--color-faint)" }}
          />
          {live ? "streaming" : "idle"}
        </span>
      </div>
      <div className="mx-4 border-t border-[var(--color-edge)]" />
      <div className="thin-scroll flex-1 overflow-y-auto px-4 py-3 text-[12px] leading-[1.75]">
        {lines.length === 0 ? (
          <p className="mono text-[var(--color-faint)]">awaiting tasking…</p>
        ) : (
          lines.map((line, i) => (
            <motion.div
              key={line.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="mono flex gap-3"
            >
              <span className="w-5 shrink-0 text-right text-[var(--color-faint)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className="w-16 shrink-0"
                style={{ color: TAG_COLOR[line.agent] ?? "var(--color-muted)" }}
              >
                {TAG[line.agent]}
              </span>
              <span className="min-w-0 flex-1 text-[var(--color-ink)]/85">{line.text}</span>
            </motion.div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
