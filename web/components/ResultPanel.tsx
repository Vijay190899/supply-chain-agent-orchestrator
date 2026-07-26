"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Mail, Gauge } from "lucide-react";
import type { AgentId, RunResult } from "@/lib/types";
import { AGENTS } from "@/lib/scenarios";

const AGENT_COLOR: Record<string, string> = {
  monitor: "var(--color-monitor)",
  optimizer: "var(--color-optimizer)",
  human_approval: "var(--color-approval)",
  communicator: "var(--color-communicator)",
};

export function ResultPanel({
  result,
  timings,
}: {
  result: RunResult | null;
  timings: { node: AgentId; ms: number }[];
}) {
  const maxMs = Math.max(1, ...timings.map((t) => t.ms));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <motion.div
        className="glass lg:col-span-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div className="flex items-center gap-2">
            <Mail size={15} style={{ color: "var(--color-communicator)" }} />
            <span className="text-xs font-semibold tracking-wide text-[var(--color-muted)] uppercase">
              Drafted customer notice
            </span>
          </div>
          {result?.approval_decision && <DecisionBadge decision={result.approval_decision} />}
        </div>
        {result?.customer_message ? (
          <MessageBody text={result.customer_message} />
        ) : (
          <p className="px-4 py-8 text-center text-sm text-[var(--color-faint)]">
            No notice drafted for this run.
          </p>
        )}
      </motion.div>

      <motion.div
        className="glass lg:col-span-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-3">
          <Gauge size={15} className="text-[var(--color-muted)]" />
          <span className="text-xs font-semibold tracking-wide text-[var(--color-muted)] uppercase">
            Node timings
          </span>
        </div>
        <div className="space-y-3 p-4">
          {timings.length === 0 ? (
            <p className="text-sm text-[var(--color-faint)]">No timings yet.</p>
          ) : (
            timings.map((t, i) => {
              const label = AGENTS.find((a) => a.id === t.node)?.label ?? t.node;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--color-muted)]">{label}</span>
                    <span className="tabular font-mono text-[var(--color-text)]">
                      {t.ms.toFixed(1)} ms
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: AGENT_COLOR[t.node] }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(t.ms / maxMs) * 100}%` }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}

function MessageBody({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <div className="relative">
      <button
        onClick={copy}
        aria-label="Copy message"
        className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]/80 px-2.5 py-1.5 text-xs text-[var(--color-muted)] transition hover:text-[var(--color-text)] focus:outline-none"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="thin-scroll overflow-x-auto px-4 py-4 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-[var(--color-text)]/90">
        {text}
      </pre>
    </div>
  );
}

function DecisionBadge({ decision }: { decision: "approved" | "rejected" }) {
  const approved = decision === "approved";
  const color = approved ? "var(--color-success)" : "var(--color-danger)";
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ background: `${color}1f`, color }}
    >
      override {decision}
    </span>
  );
}
