"use client";

import { motion } from "framer-motion";
import { SCENARIOS, type Scenario } from "@/lib/scenarios";

const SEV: Record<Scenario["severity"], string> = {
  nominal: "var(--color-ok)",
  caution: "var(--color-warm)",
  critical: "var(--color-rose)",
};

export function ScenarioPicker({
  selected,
  onSelect,
  disabled,
}: {
  selected: string;
  onSelect: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
      {SCENARIOS.map((s) => {
        const active = selected === s.id;
        return (
          <button
            key={s.id}
            onClick={() => !disabled && onSelect(s.id)}
            disabled={disabled}
            aria-pressed={active}
            className="group relative overflow-hidden rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: active ? "var(--color-glass-2)" : "transparent",
              borderColor: active ? "var(--color-edge-2)" : "var(--color-edge)",
            }}
          >
            {active && (
              <motion.span
                layoutId="scenario-glow"
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `radial-gradient(120% 90% at 0% 100%, ${SEV[s.severity]}18, transparent 60%)`,
                }}
              />
            )}
            <div className="relative flex items-center justify-between">
              <span className="mono text-[11px] text-[var(--color-muted)]">{s.code}</span>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: SEV[s.severity] }} />
            </div>
            <div
              className="serif relative mt-1 text-[18px] leading-tight"
              style={{ color: active ? "var(--color-ink)" : "var(--color-muted)" }}
            >
              {s.title}
            </div>
            <div className="mono relative mt-0.5 text-[10px] text-[var(--color-faint)]">
              {s.origin} → {s.dest}
            </div>
          </button>
        );
      })}
    </div>
  );
}
