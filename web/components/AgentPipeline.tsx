"use client";

import { motion } from "framer-motion";
import { Radar, Route, UserCheck, Mail, Check, Loader2, Minus } from "lucide-react";
import type { AgentId } from "@/lib/types";
import { AGENTS } from "@/lib/scenarios";

export type Status = "idle" | "active" | "done" | "skipped";

const ICONS: Record<AgentId, typeof Radar> = {
  monitor: Radar,
  optimizer: Route,
  human_approval: UserCheck,
  communicator: Mail,
};

function Node({
  id,
  label,
  role,
  color,
  status,
}: {
  id: AgentId;
  label: string;
  role: string;
  color: string;
  status: Status;
}) {
  const Icon = ICONS[id];
  const active = status === "active";
  const done = status === "done";
  const skipped = status === "skipped";

  return (
    <motion.div
      className="glass relative flex w-full flex-col items-center gap-2 px-4 py-5 text-center"
      style={{
        borderColor: active || done ? color : undefined,
        opacity: skipped ? 0.45 : 1,
      }}
      animate={
        active
          ? { boxShadow: [`0 0 0px ${color}00`, `0 0 26px ${color}55`, `0 0 0px ${color}00`] }
          : { boxShadow: "0 0 0px transparent" }
      }
      transition={active ? { duration: 1.6, repeat: Infinity } : { duration: 0.3 }}
    >
      <div
        className="relative flex h-12 w-12 items-center justify-center rounded-full"
        style={{
          background: done || active ? `${color}1f` : "var(--color-surface-2)",
          border: `1.5px solid ${done || active ? color : "var(--color-border)"}`,
        }}
      >
        {done ? (
          <Check size={22} style={{ color }} />
        ) : active ? (
          <Loader2 size={20} className="animate-spin" style={{ color }} />
        ) : skipped ? (
          <Minus size={20} className="text-[var(--color-faint)]" />
        ) : (
          <Icon size={20} className="text-[var(--color-muted)]" />
        )}
      </div>
      <div className="text-sm font-semibold" style={{ color: done || active ? color : undefined }}>
        {label}
      </div>
      <div className="text-[11px] leading-tight text-[var(--color-muted)]">
        {skipped ? "skipped" : role}
      </div>
    </motion.div>
  );
}

function Connector({ filled }: { filled: boolean }) {
  return (
    <div className="relative hidden h-[2px] w-10 shrink-0 self-center overflow-hidden rounded bg-[var(--color-border)] md:block">
      <motion.div
        className="absolute inset-y-0 left-0 bg-[var(--color-accent)]"
        initial={{ width: 0 }}
        animate={{ width: filled ? "100%" : 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      />
    </div>
  );
}

export function AgentPipeline({ statuses }: { statuses: Record<AgentId, Status> }) {
  return (
    <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
      {AGENTS.map((agent, i) => {
        const prev = AGENTS[i - 1];
        const filled = prev ? statuses[prev.id] === "done" : false;
        return (
          <div key={agent.id} className="contents">
            {i > 0 && <Connector filled={filled} />}
            <div className="flex-1">
              <Node {...agent} status={statuses[agent.id]} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
