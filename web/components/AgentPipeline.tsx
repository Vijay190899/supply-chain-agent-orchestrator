"use client";

import { motion } from "framer-motion";
import type { AgentId } from "@/lib/types";
import { AGENTS } from "@/lib/scenarios";

export type Status = "idle" | "active" | "done" | "skipped";

const WARM = "var(--color-warm)";
const CYAN = "var(--color-cyan)";
const OK = "var(--color-ok)";

function glow(id: AgentId) {
  return id === "human_approval" ? CYAN : WARM;
}

const STATUS: Record<Status, string> = {
  idle: "standby",
  active: "working",
  done: "complete",
  skipped: "bypassed",
};

function Card({
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
  const c = glow(id);
  const active = status === "active";
  const done = status === "done";
  const held = active && awaiting && id === "human_approval";
  const text = held ? "awaiting authority" : STATUS[status];
  const tint = held ? CYAN : active ? c : done ? OK : "var(--color-faint)";

  return (
    <motion.div
      className="glass relative flex-1 overflow-hidden px-4 py-4"
      style={{
        borderColor: active ? c : done ? "var(--color-edge-2)" : undefined,
        opacity: status === "skipped" ? 0.4 : 1,
      }}
      animate={
        active
          ? { boxShadow: [`0 0 0px ${c}00`, `0 0 44px -12px ${c}`, `0 0 0px ${c}00`] }
          : { boxShadow: "0 0 0px transparent" }
      }
      transition={active ? { duration: held ? 1.4 : 2, repeat: Infinity, ease: "easeInOut" } : {}}
    >
      {/* light wash from the active accent */}
      {active && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(120% 80% at 50% 120%, ${c}22, transparent 70%)` }}
        />
      )}
      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="kicker">{station}</span>
          <motion.span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: tint }}
            animate={active ? { opacity: [1, 0.35, 1] } : {}}
            transition={active ? { duration: 1.4, repeat: Infinity } : {}}
          />
        </div>
        <div
          className="serif mt-2 text-[22px] leading-none"
          style={{ color: active ? c : done ? "var(--color-ink)" : "var(--color-muted)" }}
        >
          {label}
        </div>
        <div className="mono mt-1.5 text-[10px]" style={{ color: tint }}>
          {text}
        </div>
      </div>
    </motion.div>
  );
}

function Beam({ filled, active }: { filled: boolean; active: boolean }) {
  return (
    <div className="relative hidden h-px w-10 shrink-0 self-center md:block">
      <div className="absolute inset-0 bg-[var(--color-edge)]" />
      <motion.div
        className="absolute inset-y-0 left-0"
        style={{ background: "var(--color-warm)" }}
        initial={{ width: 0 }}
        animate={{ width: filled ? "100%" : 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
      {active && (
        <motion.div
          className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
          style={{ background: "#fff", boxShadow: "0 0 12px 2px var(--color-warm)" }}
          initial={{ left: "-8px", opacity: 0 }}
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
    <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
      {AGENTS.map((agent, i) => {
        const prev = AGENTS[i - 1];
        const prevDone = prev ? statuses[prev.id] === "done" : false;
        const handoff = prevDone && statuses[agent.id] === "active";
        return (
          <div key={agent.id} className="contents">
            {i > 0 && <Beam filled={prevDone} active={handoff} />}
            <Card
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
