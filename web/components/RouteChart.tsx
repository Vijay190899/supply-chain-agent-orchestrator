"use client";

import { motion } from "framer-motion";
import type { Scenario } from "@/lib/scenarios";

const W = 820;
const H = 230;
const BASE = 150;
const OX = 74;
const DX = 746;

const SEV_COLOR: Record<Scenario["severity"], string> = {
  nominal: "var(--color-nominal)",
  caution: "var(--color-amber)",
  critical: "var(--color-rose)",
};

export function RouteChart({
  scenario,
  rerouted,
  running,
}: {
  scenario: Scenario;
  rerouted: boolean;
  running: boolean;
}) {
  const chokeX = OX + scenario.chokeAt * (DX - OX);
  const sev = SEV_COLOR[scenario.severity];

  // reroute detours north around the chokepoint
  const reroute = `M ${chokeX - 130} ${BASE}
    C ${chokeX - 70} ${BASE}, ${chokeX - 70} 66, ${chokeX} 66
    C ${chokeX + 70} 66, ${chokeX + 70} ${BASE}, ${chokeX + 130} ${BASE}
    L ${DX} ${BASE}`;

  return (
    <div className="panel-lit relative overflow-hidden px-4 pt-3 pb-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="kicker">lane chart · {scenario.code}</span>
        <span className="telemetry text-[11px]" style={{ color: sev }}>
          {scenario.blocked ? `${scenario.choke.toUpperCase()} · OBSTRUCTED` : "LANES NOMINAL"}
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Shipping lane chart">
        {/* faint depth contours */}
        {[40, 96, 200].map((y, i) => (
          <path
            key={i}
            d={`M0 ${y} C 200 ${y - 14}, 620 ${y + 16}, ${W} ${y - 6}`}
            fill="none"
            stroke="rgba(120,160,210,0.05)"
            strokeWidth={1}
          />
        ))}

        {/* direct rhumb line */}
        <line
          x1={OX}
          y1={BASE}
          x2={DX}
          y2={BASE}
          stroke="var(--color-hair-2)"
          strokeWidth={1.5}
          strokeDasharray="2 6"
        />
        {/* the traversable segment before the choke stays lit; past it dims if blocked */}
        <line
          x1={OX}
          y1={BASE}
          x2={scenario.blocked ? chokeX : DX}
          y2={BASE}
          stroke="var(--color-muted)"
          strokeWidth={1.5}
          strokeDasharray="2 6"
          opacity={0.5}
        />

        {/* reroute path drawn when the optimizer commits it */}
        {rerouted && scenario.blocked && (
          <motion.path
            d={reroute}
            fill="none"
            stroke="var(--color-amber)"
            strokeWidth={2.25}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }}
            style={{ filter: "drop-shadow(0 0 6px rgba(245,165,36,0.4))" }}
          />
        )}

        {/* endpoints */}
        <Endpoint x={OX} label={scenario.origin} />
        <Endpoint x={DX} label={scenario.dest} align="end" />

        {/* chokepoint marker */}
        <g transform={`translate(${chokeX} ${BASE})`}>
          {scenario.blocked ? (
            <>
              <motion.rect
                x={-7}
                y={-7}
                width={14}
                height={14}
                transform="rotate(45)"
                fill="none"
                stroke={sev}
                strokeWidth={2}
                animate={running ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
                transition={{ duration: 1.6, repeat: running ? Infinity : 0, ease: "easeInOut" }}
              />
              <line x1={-4} y1={-4} x2={4} y2={4} stroke={sev} strokeWidth={2} />
              <line x1={-4} y1={4} x2={4} y2={-4} stroke={sev} strokeWidth={2} />
            </>
          ) : (
            <circle r={4} fill="none" stroke="var(--color-cyan)" strokeWidth={1.5} />
          )}
          <text
            y={26}
            textAnchor="middle"
            className="telemetry"
            fontSize={9}
            fill="var(--color-faint)"
          >
            {scenario.choke.toUpperCase()}
          </text>
        </g>
      </svg>
    </div>
  );
}

function Endpoint({ x, label, align }: { x: number; label: string; align?: "end" }) {
  return (
    <g transform={`translate(${x} ${BASE})`}>
      <circle r={5} fill="var(--color-deep)" stroke="var(--color-text)" strokeWidth={1.5} />
      <circle r={1.5} fill="var(--color-text)" />
      <text
        x={align === "end" ? 0 : 0}
        y={-14}
        textAnchor="middle"
        className="telemetry"
        fontSize={11}
        fontWeight={600}
        fill="var(--color-text)"
      >
        {label}
      </text>
    </g>
  );
}
