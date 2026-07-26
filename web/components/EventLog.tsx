"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { AgentId } from "@/lib/types";

export type LogLine = { id: number; agent: AgentId | "system"; text: string };

const TAG: Record<string, string> = {
  monitor: "monitor",
  optimizer: "optimizer",
  human_approval: "approval",
  communicator: "communic",
  system: "system",
};

const TAG_COLOR: Record<string, string> = {
  human_approval: "var(--color-human)",
  system: "var(--color-faint)",
};

export function EventLog({ lines }: { lines: LogLine[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [lines]);

  return (
    <div className="panel flex h-full min-h-[260px] flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5">
        <span className="font-mono text-[12px] text-[var(--color-text-2)]">event stream</span>
        <span className="font-mono text-[11px] text-[var(--color-faint)]">
          {lines.length} {lines.length === 1 ? "event" : "events"}
        </span>
      </div>
      <div className="mx-4 border-t border-[var(--color-border)]" />
      <div className="thin-scroll flex-1 overflow-y-auto px-4 py-3 font-mono text-[12.5px] leading-[1.7]">
        {lines.length === 0 ? (
          <p className="text-[var(--color-faint)]">idle · press run to begin</p>
        ) : (
          lines.map((line, i) => (
            <motion.div
              key={line.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="flex gap-3 tabular"
            >
              <span className="w-6 shrink-0 text-right text-[var(--color-faint)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className="w-[68px] shrink-0"
                style={{ color: TAG_COLOR[line.agent] ?? "var(--color-text-2)" }}
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
