"use client";

import { motion } from "framer-motion";
import type { AgentId } from "@/lib/types";
import { AGENTS } from "@/lib/scenarios";

export type Status = "idle" | "active" | "done" | "skipped";

const AMBER = "var(--color-amber)";
const CYAN = "var(--color-cyan)";
const NOMINAL = "var(--color-nominal)";

function accent(id: AgentId) {
  return id === "human_approval" ? CYAN : AMBER;
}

const STATUS_TEXT: Record<Status, string> = {
  idle: "standby",
  active: "working",
  done: "complete",
  skipped: "bypassed",
};

function Station({
  id,
  label,
  station,
  status,
  awaiting,
}: {
  id: AgentId;
  label: string;
  station: string;
  status: Status;
  awaiting: boolean;
}) {
  const color = accent(id);
  const active = status === "active";
  const done = status === "done";
  const held = active && awaiting && id === "human_approval";
  const statusText = held ? "awaiting master" : STATUS_TEXT[status];
  const statusColor = held
    ? CYAN
    : active
      ? color
      : done
        ? NOMINAL
        : "var(--color-faint)";

  return (
    <motion.div
      className="panel relative flex-1 px-3 py-2.5"
      style={{
        borderColor: active || done ? `color-mix(in srgb, ${color} 55%, transparent)` : undefined,
        boxShadow: active ? `inset 0 0 0 1px ${color}, 0 0 24px -10px ${color}` : undefined,
        opacity: status === "skipped" ? 0.45 : 1,
      }}
      animate={
        held
          ? { boxShadow: [`0 0 0px ${CYAN}00`, `0 0 26px -6px ${CYAN}`, `0 0 0px ${CYAN}00`] }
          : {}
      }
      transition={held ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : {}}
    >
      <div className="flex items-center justify-between">
        <span className="kicker">{station}</span>
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: statusColor }}
        />
      </div>
      <div
        className="mt-1 font-[var(--font-display)] text-[15px] font-semibold"
        style={{ color: active ? color : done ? "var(--color-text)" : "var(--color-muted)" }}
      >
        {label}
      </div>
      <div className="telemetry mt-0.5 text-[10px]" style={{ color: statusColor }}>
        {statusText}
      </div>
    </motion.div>
  );
}

function Link({ filled, active }: { filled: boolean; active: boolean }) {
  return (
    <div className="relative hidden h-px w-8 shrink-0 self-center md:block">
      <div className="absolute inset-0 bg-[var(--color-hair-2)]" />
      <motion.div
        className="absolute inset-y-0 left-0 bg-[var(--color-amber)]"
        initial={{ width: 0 }}
        animate={{ width: filled ? "100%" : 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
      {active && (
        <motion.div
          className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[var(--color-amber-hot)]"
          style={{ boxShadow: "0 0 8px 1px var(--color-amber)" }}
          initial={{ left: "-6px", opacity: 0 }}
          animate={{ left: "100%", opacity: [0, 1, 1, 0] }}
          transition={{ duration: 0.7, ease: [0.45, 0, 0.55, 1] }}
        />
      )}
    </div>
  );
}

export function AgentPipeline({
  statuses,
  awaiting,
}: {
  statuses: Record<AgentId, Status>;
  awaiting: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-stretch">
      {AGENTS.map((agent, i) => {
        const prev = AGENTS[i - 1];
        const prevDone = prev ? statuses[prev.id] === "done" : false;
        const handoff = prevDone && statuses[agent.id] === "active";
        return (
          <div key={agent.id} className="contents">
            {i > 0 && <Link filled={prevDone} active={handoff} />}
            <Station
              id={agent.id}
              label={agent.label}
              station={agent.station}
              status={statuses[agent.id]}
              awaiting={awaiting}
            />
          </div>
        );
      })}
    </div>
  );
}
