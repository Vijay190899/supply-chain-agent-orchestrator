"use client";

import { SCENARIOS, type Scenario } from "@/lib/scenarios";

const SEV_COLOR: Record<Scenario["severity"], string> = {
  none: "var(--color-success)",
  moderate: "var(--color-machine)",
  severe: "var(--color-danger)",
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
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {SCENARIOS.map((s) => {
        const active = selected === s.id;
        return (
          <button
            key={s.id}
            onClick={() => !disabled && onSelect(s.id)}
            disabled={disabled}
            aria-pressed={active}
            className="group relative rounded-[8px] px-3.5 py-3 text-left transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: active ? "var(--color-surface-2)" : "transparent",
              border: `1px solid ${active ? "var(--color-border-strong)" : "var(--color-border)"}`,
            }}
          >
            {active && (
              <span
                className="absolute top-2.5 bottom-2.5 left-0 w-[2px] rounded-full"
                style={{ background: "var(--color-machine)" }}
              />
            )}
            <div className="flex items-center justify-between">
              <span
                className="text-[13.5px] font-medium"
                style={{ color: active ? "var(--color-text)" : "var(--color-text-2)" }}
              >
                {s.title}
              </span>
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: SEV_COLOR[s.severity] }}
              />
            </div>
            <div className="mt-0.5 font-mono text-[11px] text-[var(--color-faint)]">{s.route}</div>
          </button>
        );
      })}
    </div>
  );
}
