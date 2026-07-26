"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check } from "lucide-react";
import type { AgentId, RunResult } from "@/lib/types";
import { AGENTS } from "@/lib/scenarios";

const EASE = [0.22, 1, 0.36, 1] as const;

function barColor(node: AgentId) {
  return node === "human_approval" ? "var(--color-human)" : "var(--color-machine)";
}

export function ResultPanel({
  result,
  timings,
  active,
}: {
  result: RunResult | null;
  timings: { node: AgentId; ms: number }[];
  active: boolean;
}) {
  if (!active) {
    return (
      <div className="panel flex min-h-[260px] items-center justify-center p-6">
        <p className="text-center font-mono text-[12.5px] text-[var(--color-faint)]">
          results appear here once a run completes
        </p>
      </div>
    );
  }

  const maxMs = Math.max(1, ...timings.map((t) => t.ms));

  return (
    <div className="space-y-4">
      <div className="panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-[12px] text-[var(--color-text-2)]">node latency</span>
          <span className="font-mono text-[11px] text-[var(--color-faint)]">wall time</span>
        </div>
        <div className="space-y-2.5">
          {timings.map((t, i) => {
            const label = AGENTS.find((a) => a.id === t.node)?.label ?? t.node;
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="w-24 shrink-0 font-mono text-[12px] text-[var(--color-text-2)]">
                  {label.toLowerCase()}
                </span>
                <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: barColor(t.node), transformOrigin: "left" }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: Math.max(0.02, t.ms / maxMs) }}
                    transition={{ duration: 0.5, ease: EASE, delay: i * 0.06 }}
                  />
                </div>
                <span className="tabular w-16 shrink-0 text-right font-mono text-[12px] text-[var(--color-text)]">
                  {t.ms.toFixed(1)}ms
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {result?.customer_message ? (
        <Message text={result.customer_message} decision={result.approval_decision} />
      ) : (
        <div className="panel p-4">
          <p className="font-mono text-[12.5px] text-[var(--color-faint)]">
            no customer notice drafted for this run
          </p>
        </div>
      )}
    </div>
  );
}

function Message({
  text,
  decision,
}: {
  text: string;
  decision: "approved" | "rejected" | null;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div
      className="panel overflow-hidden"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: 0.24 }}
    >
      <div className="flex items-center justify-between px-4 py-2.5">
        <span className="font-mono text-[12px] text-[var(--color-text-2)]">drafted notice</span>
        <div className="flex items-center gap-3">
          {decision && (
            <span
              className="font-mono text-[11px]"
              style={{
                color: decision === "approved" ? "var(--color-success)" : "var(--color-danger)",
              }}
            >
              override {decision}
            </span>
          )}
          <button
            onClick={copy}
            aria-label="Copy notice"
            className="text-[var(--color-faint)] transition-colors hover:text-[var(--color-text)] focus-visible:outline-none"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </div>
      <div className="mx-4 border-t border-[var(--color-border)]" />
      <pre className="thin-scroll overflow-x-auto px-4 py-3.5 font-mono text-[12.5px] leading-[1.65] whitespace-pre-wrap text-[var(--color-text)]/85">
        {text}
      </pre>
    </motion.div>
  );
}
