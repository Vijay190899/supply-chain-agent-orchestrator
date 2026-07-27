"use client";

import { SCENARIOS, type Scenario } from "@/lib/scenarios";

const SEV: Record<Scenario["severity"], { tag: string; color: string }> = {
  nominal: { tag: "NOMINAL", color: "var(--color-nominal)" },
  caution: { tag: "CAUTION", color: "var(--color-amber)" },
  critical: { tag: "CRITICAL", color: "var(--color-rose)" },
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
        const sev = SEV[s.severity];
        return (
          <button
            key={s.id}
            onClick={() => !disabled && onSelect(s.id)}
            disabled={disabled}
            aria-pressed={active}
            className="group relative rounded-[4px] px-3 py-2.5 text-left transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: active ? "var(--color-panel-2)" : "transparent",
              border: `1px solid ${active ? "var(--color-hair-2)" : "var(--color-hair)"}`,
            }}
          >
            {active && (
              <span
                className="absolute top-2 bottom-2 left-0 w-[2px]"
                style={{ background: sev.color }}
              />
            )}
            <div className="flex items-center justify-between">
              <span className="telemetry text-[11px] text-[var(--color-muted)]">{s.code}</span>
              <span className="telemetry text-[9px]" style={{ color: sev.color }}>
                {sev.tag}
              </span>
            </div>
            <div
              className="mt-0.5 text-[13.5px] font-medium"
              style={{ color: active ? "var(--color-text)" : "var(--color-muted)" }}
            >
              {s.title}
            </div>
            <div className="telemetry mt-0.5 text-[10px] text-[var(--color-faint)]">
              {s.origin} → {s.dest}
            </div>
          </button>
        );
      })}
    </div>
  );
}
