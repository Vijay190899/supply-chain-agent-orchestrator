"use client";

import { motion } from "framer-motion";
import { CloudLightning, Ship, CheckCircle2 } from "lucide-react";
import { SCENARIOS, type Scenario } from "@/lib/scenarios";

const ICON: Record<string, typeof Ship> = {
  clear: CheckCircle2,
  "storm-north-sea": CloudLightning,
  "suez-blockage": Ship,
};

const SEVERITY: Record<Scenario["severity"], { label: string; color: string }> = {
  none: { label: "clear", color: "var(--color-success)" },
  moderate: { label: "moderate", color: "var(--color-optimizer)" },
  severe: { label: "severe", color: "var(--color-danger)" },
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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {SCENARIOS.map((s) => {
        const Icon = ICON[s.id];
        const active = selected === s.id;
        const sev = SEVERITY[s.severity];
        return (
          <motion.button
            key={s.id}
            onClick={() => !disabled && onSelect(s.id)}
            disabled={disabled}
            whileTap={disabled ? undefined : { scale: 0.98 }}
            className="glass glass-hover flex flex-col gap-2 p-4 text-left disabled:cursor-not-allowed disabled:opacity-60"
            style={{ borderColor: active ? "var(--color-accent)" : undefined }}
            aria-pressed={active}
          >
            <div className="flex items-center justify-between">
              <Icon
                size={18}
                style={{ color: active ? "var(--color-accent)" : "var(--color-muted)" }}
              />
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ background: `${sev.color}1f`, color: sev.color }}
              >
                {sev.label}
              </span>
            </div>
            <div className="text-sm font-semibold">{s.title}</div>
            <div className="font-mono text-[11px] text-[var(--color-muted)]">{s.route}</div>
            <div className="text-xs leading-snug text-[var(--color-muted)]">{s.blurb}</div>
          </motion.button>
        );
      })}
    </div>
  );
}
