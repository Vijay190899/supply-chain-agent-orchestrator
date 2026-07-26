"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal } from "lucide-react";
import type { AgentId } from "@/lib/types";

export type LogLine = { id: number; agent: AgentId | "system"; text: string };

const DOT: Record<string, string> = {
  monitor: "var(--color-monitor)",
  optimizer: "var(--color-optimizer)",
  human_approval: "var(--color-approval)",
  communicator: "var(--color-communicator)",
  system: "var(--color-faint)",
};

export function EventLog({ lines }: { lines: LogLine[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [lines]);

  return (
    <div className="glass flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-3">
        <Terminal size={15} className="text-[var(--color-muted)]" />
        <span className="text-xs font-semibold tracking-wide text-[var(--color-muted)] uppercase">
          Event stream
        </span>
      </div>
      <div className="thin-scroll min-h-[180px] flex-1 overflow-y-auto p-4 font-mono text-[13px] leading-relaxed">
        {lines.length === 0 ? (
          <p className="text-[var(--color-faint)]">Waiting for a run…</p>
        ) : (
          <AnimatePresence initial={false}>
            {lines.map((line) => (
              <motion.div
                key={line.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="flex gap-2.5 py-[3px]"
              >
                <span
                  className="mt-[6px] h-2 w-2 shrink-0 rounded-full"
                  style={{ background: DOT[line.agent] }}
                />
                <span className="text-[var(--color-text)]/90">{line.text}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
