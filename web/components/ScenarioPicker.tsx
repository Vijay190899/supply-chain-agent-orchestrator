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
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
      {SCENARIOS.map((s) => {
        const active = selected === s.id;
        return (
          <button
            key={s.id}
            onClick={() => !disabled && onSelect(s.id)}
            disabled={disabled}
            aria-pressed={active}
            className="group relative rounded-2xl px-4 py-3 text-left transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: active ? "rgba(255,255,255,0.05)" : "transparent" }}
          >
            {active && (
              <motion.span
                layoutId="scenario-bar"
                className="absolute top-3 bottom-3 left-0 w-[2px] rounded-full"
                style={{ background: SEV[s.severity] }}
              />
            )}
            <div className="flex items-center justify-between">
              <span className="mono text-[11px] text-[var(--color-muted)]">{s.code}</span>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: SEV[s.severity] }} />
            </div>
            <div
              className="serif mt-1 text-[19px] leading-tight transition-colors"
              style={{ color: active ? "var(--color-ink)" : "var(--color-muted)" }}
            >
              {s.title}
            </div>
            <div className="mono mt-0.5 text-[10px] text-[var(--color-faint)]">
              {s.origin} → {s.dest}
            </div>
          </button>
        );
      })}
    </div>
  );
}
