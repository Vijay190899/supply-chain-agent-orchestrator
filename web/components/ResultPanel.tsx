"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import { Copy, Check } from "lucide-react";
import type { AgentId, RunResult } from "@/lib/types";
import { AGENTS } from "@/lib/scenarios";

const EASE = [0.2, 0.8, 0.2, 1] as const;

function barColor(node: AgentId) {
  return node === "human_approval" ? "var(--color-cyan)" : "var(--color-amber)";
}

/** Odometer count-up for telemetry numbers. */
function Odometer({ to, format }: { to: number; format: (n: number) => string }) {
  const mv = useMotionValue(0);
  const [txt, setTxt] = useState(format(0));
  useEffect(() => {
    const unsub = mv.on("change", (v) => setTxt(format(v)));
    const controls = animate(mv, to, { duration: 0.9, ease: [0.2, 0.6, 0.2, 1] });
    return () => {
      controls.stop();
      unsub();
    };
  }, [to, mv, format]);
  return <span className="telemetry tabular">{txt}</span>;
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
        <p className="telemetry text-center text-[12px] text-[var(--color-faint)]">
          instrument readout appears on completion
        </p>
      </div>
    );
  }

  const opt = result?.chosen_option ?? null;
  const maxMs = Math.max(1, ...timings.map((t) => t.ms));

  return (
    <div className="space-y-3">
      {/* instrument cluster */}
      <div className="panel-lit grid grid-cols-3 divide-x divide-[var(--color-hair)]">
        <Instrument label="cost Δ">
          {opt ? (
            <span style={{ color: opt.cost_delta > 0.15 ? "var(--color-rose)" : "var(--color-text)" }}>
              <Odometer to={opt.cost_delta * 100} format={(n) => `+${n.toFixed(0)}%`} />
            </span>
          ) : (
            <span className="telemetry text-[var(--color-faint)]">--</span>
          )}
        </Instrument>
        <Instrument label="eta Δ">
          {opt ? (
            <Odometer to={opt.eta_delta_hours} format={(n) => `+${n.toFixed(0)}h`} />
          ) : (
            <span className="telemetry text-[var(--color-faint)]">--</span>
          )}
        </Instrument>
        <Instrument label="ruling">
          <span
            className="telemetry text-[15px]"
            style={{
              color:
                result?.approval_decision === "approved"
                  ? "var(--color-nominal)"
                  : result?.approval_decision === "rejected"
                    ? "var(--color-rose)"
                    : "var(--color-muted)",
            }}
          >
            {result?.approval_decision ? result.approval_decision.toUpperCase() : "AUTO"}
          </span>
        </Instrument>
      </div>

      {/* station latency */}
      <div className="panel p-3">
        <div className="kicker mb-2">station latency</div>
        <div className="space-y-2">
          {timings.map((t, i) => {
            const label = AGENTS.find((a) => a.id === t.node)?.label ?? t.node;
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="w-24 shrink-0 telemetry text-[11px] text-[var(--color-muted)]">
                  {label.toLowerCase()}
                </span>
                <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-[var(--color-deep)]">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: barColor(t.node), transformOrigin: "left" }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: Math.max(0.02, t.ms / maxMs) }}
                    transition={{ duration: 0.5, ease: EASE, delay: i * 0.08 }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right telemetry text-[11px] text-[var(--color-text)]">
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
        <div className="panel p-3">
          <p className="telemetry text-[12px] text-[var(--color-faint)]">no notice issued</p>
        </div>
      )}
    </div>
  );
}

function Instrument({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3">
      <div className="kicker mb-1">{label}</div>
      <div className="text-[17px] leading-none">{children}</div>
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
      className="panel overflow-hidden"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: 0.2 }}
    >
      <div className="flex items-center justify-between px-3 py-2">
        <span className="kicker">notice to customer</span>
        <button
          onClick={copy}
          aria-label="Copy notice"
          className="text-[var(--color-faint)] transition-colors hover:text-[var(--color-text)] focus-visible:outline-none"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>
      <div className="mx-3 border-t border-[var(--color-hair)]" />
      <pre className="thin-scroll overflow-x-auto px-3 py-3 font-mono text-[12px] leading-[1.65] whitespace-pre-wrap text-[var(--color-text)]/85">
        {text}
      </pre>
    </motion.div>
  );
}
