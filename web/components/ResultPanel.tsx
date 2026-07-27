"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import { Copy, Check } from "lucide-react";
import type { AgentId, RunResult } from "@/lib/types";
import { AGENTS } from "@/lib/scenarios";

const EASE = [0.16, 1, 0.3, 1] as const;

function barColor(node: AgentId) {
  return node === "human_approval" ? "var(--color-cyan)" : "var(--color-warm)";
}

function Odometer({ to, format }: { to: number; format: (n: number) => string }) {
  const mv = useMotionValue(0);
  const [txt, setTxt] = useState(format(0));
  useEffect(() => {
    const unsub = mv.on("change", (v) => setTxt(format(v)));
    const controls = animate(mv, to, { duration: 1, ease: [0.2, 0.6, 0.2, 1] });
    return () => {
      controls.stop();
      unsub();
    };
  }, [to, mv, format]);
  return <span className="mono tab">{txt}</span>;
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
      <div className="glass flex min-h-[280px] items-center justify-center p-6">
        <p className="mono text-center text-[12px] text-[var(--color-faint)]">
          readout resolves on completion
        </p>
      </div>
    );
  }

  const opt = result?.chosen_option ?? null;
  const maxMs = Math.max(1, ...timings.map((t) => t.ms));

  return (
    <div className="space-y-3">
      <div className="glass-2 grid grid-cols-3 divide-x divide-[var(--color-edge)] overflow-hidden">
        <Metric label="cost delta">
          {opt ? (
            <span style={{ color: opt.cost_delta > 0.15 ? "var(--color-rose)" : "var(--color-ink)" }}>
              <Odometer to={opt.cost_delta * 100} format={(n) => `+${n.toFixed(0)}%`} />
            </span>
          ) : (
            <span className="mono text-[var(--color-faint)]">--</span>
          )}
        </Metric>
        <Metric label="eta delta">
          {opt ? (
            <Odometer to={opt.eta_delta_hours} format={(n) => `+${n.toFixed(0)}h`} />
          ) : (
            <span className="mono text-[var(--color-faint)]">--</span>
          )}
        </Metric>
        <Metric label="ruling">
          <span
            className="serif text-[26px] leading-none"
            style={{
              color:
                result?.approval_decision === "approved"
                  ? "var(--color-ok)"
                  : result?.approval_decision === "rejected"
                    ? "var(--color-rose)"
                    : "var(--color-muted)",
            }}
          >
            {result?.approval_decision ?? "auto"}
          </span>
        </Metric>
      </div>

      <div className="glass p-4">
        <div className="kicker mb-3">station latency</div>
        <div className="space-y-2.5">
          {timings.map((t, i) => {
            const label = AGENTS.find((a) => a.id === t.node)?.label ?? t.node;
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="mono w-24 shrink-0 text-[11px] text-[var(--color-muted)]">
                  {label.toLowerCase()}
                </span>
                <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-white/5">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: barColor(t.node), transformOrigin: "left" }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: Math.max(0.02, t.ms / maxMs) }}
                    transition={{ duration: 0.55, ease: EASE, delay: i * 0.08 }}
                  />
                </div>
                <span className="mono w-16 shrink-0 text-right text-[11px] text-[var(--color-ink)]">
                  {t.ms.toFixed(1)}ms
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {result?.customer_message ? (
        <Notice text={result.customer_message} />
      ) : (
        <div className="glass p-4">
          <p className="mono text-[12px] text-[var(--color-faint)]">no notice issued</p>
        </div>
      )}
    </div>
  );
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-4">
      <div className="kicker mb-1.5">{label}</div>
      <div className="text-[22px] leading-none">{children}</div>
    </div>
  );
}

function Notice({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <motion.div
      className="glass overflow-hidden"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <span className="kicker">customer notice</span>
        <button
          onClick={copy}
          aria-label="Copy notice"
          className="text-[var(--color-faint)] transition-colors hover:text-[var(--color-ink)] focus-visible:outline-none"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>
      <div className="mx-4 border-t border-[var(--color-edge)]" />
      <pre className="thin-scroll overflow-x-auto px-4 py-3.5 font-mono text-[12px] leading-[1.7] whitespace-pre-wrap text-[var(--color-ink)]/85">
        {text}
      </pre>
    </motion.div>
  );
}
