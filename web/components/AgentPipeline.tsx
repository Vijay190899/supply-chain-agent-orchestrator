"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { AgentId } from "@/lib/types";
import { AGENTS } from "@/lib/scenarios";

export type Status = "idle" | "active" | "done" | "skipped";

const MACHINE = "var(--color-machine)";
const HUMAN = "var(--color-human)";
const SUCCESS = "var(--color-success)";

function activeColor(id: AgentId) {
  return id === "human_approval" ? HUMAN : MACHINE;
}

function Node({
  id,
  index,
  label,
  role,
  status,
}: {
  id: AgentId;
  index: number;
  label: string;
  role: string;
  status: Status;
}) {
  const color = activeColor(id);
  const active = status === "active";
  const done = status === "done";
  const skipped = status === "skipped";

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      {/* status pip */}
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
        {active && (
          <motion.span
            className="absolute inset-0 rounded-[8px]"
            style={{ background: color, opacity: 0.14 }}
            animate={{ opacity: [0.14, 0.05, 0.14] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <div
          className="flex h-9 w-9 items-center justify-center rounded-[8px] font-mono text-[13px]"
          style={{
            border: `1px solid ${active || done ? color : "var(--color-border-strong)"}`,
            color: done ? SUCCESS : active ? color : "var(--color-faint)",
            background: active ? `color-mix(in srgb, ${color} 10%, transparent)` : "transparent",
          }}
        >
          {done ? (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 24, delay: 0.1 }}
            >
              <Check size={16} style={{ color: SUCCESS }} strokeWidth={2.5} />
            </motion.span>
          ) : (
            <span>{index + 1}</span>
          )}
        </div>
      </div>

      <div className="min-w-0" style={{ opacity: skipped ? 0.4 : 1 }}>
        <div
          className="truncate font-mono text-[13px] font-medium"
          style={{ color: active ? color : done ? "var(--color-text)" : "var(--color-text-2)" }}
        >
          {label.toLowerCase()}
        </div>
        <div className="truncate text-[11px] text-[var(--color-faint)]">
          {skipped ? "skipped" : active ? "running…" : role}
        </div>
      </div>
    </div>
  );
}

function Connector({ filled, vertical }: { filled: boolean; vertical?: boolean }) {
  if (vertical) {
    return (
      <div className="ml-[18px] h-5 w-[2px] overflow-hidden bg-[var(--color-border-strong)]">
        <motion.div
          className="w-full"
          style={{ background: MACHINE, transformOrigin: "top" }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: filled ? 1 : 0, height: "100%" }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
        />
      </div>
    );
  }
  return (
    <div className="mx-1 hidden h-[2px] flex-1 overflow-hidden bg-[var(--color-border-strong)] md:block">
      <motion.div
        className="h-full"
        style={{ background: MACHINE, transformOrigin: "left" }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: filled ? 1 : 0, width: "100%" }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
      />
    </div>
  );
}

export function AgentPipeline({ statuses }: { statuses: Record<AgentId, Status> }) {
  return (
    <div className="panel-focal blueprint px-5 py-5 sm:px-7 sm:py-6">
      {/* desktop: horizontal rail */}
      <div className="hidden items-center md:flex">
        {AGENTS.map((agent, i) => {
          const prev = AGENTS[i - 1];
          const filled = prev ? statuses[prev.id] === "done" : false;
          return (
            <div key={agent.id} className="contents">
              {i > 0 && <Connector filled={filled} />}
              <Node
                id={agent.id}
                index={i}
                label={agent.label}
                role={agent.role}
                status={statuses[agent.id]}
              />
            </div>
          );
        })}
      </div>

      {/* mobile: vertical rail */}
      <div className="flex flex-col md:hidden">
        {AGENTS.map((agent, i) => {
          const prev = AGENTS[i - 1];
          const filled = prev ? statuses[prev.id] === "done" : false;
          return (
            <div key={agent.id}>
              {i > 0 && <Connector filled={filled} vertical />}
              <Node
                id={agent.id}
                index={i}
                label={agent.label}
                role={agent.role}
                status={statuses[agent.id]}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
