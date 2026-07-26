"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Check, X } from "lucide-react";
import type { ApprovalPayload, Decision } from "@/lib/types";

export function ApprovalModal({
  payload,
  onDecide,
}: {
  payload: ApprovalPayload | null;
  onDecide: (d: Decision) => void;
}) {
  const rejectRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (payload) rejectRef.current?.focus();
  }, [payload]);

  return (
    <AnimatePresence>
      {payload && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="approval-title"
            className="glass relative w-full max-w-md p-6"
            style={{ borderColor: "var(--color-approval)" }}
            initial={{ scale: 0.92, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 12, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
          >
            <div className="mb-4 flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{ background: "var(--color-approval)1f" }}
              >
                <AlertTriangle size={20} style={{ color: "var(--color-approval)" }} />
              </div>
              <div>
                <h2 id="approval-title" className="text-base font-semibold">
                  Human approval required
                </h2>
                <p className="text-xs text-[var(--color-muted)]">
                  Cost override exceeds the 15% threshold
                </p>
              </div>
            </div>

            <div className="mb-5 space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/60 p-4 text-sm">
              <Row label="Route" value={payload.route_id} />
              <Row label="Option" value={payload.option} />
              <Row
                label="Cost impact"
                value={`+${Math.round(payload.cost_delta * 100)}%`}
                emphasize="var(--color-danger)"
              />
              <Row label="ETA impact" value={`+${payload.eta_delta_hours}h`} />
            </div>

            <p className="mb-4 text-xs leading-relaxed text-[var(--color-muted)]">
              The agent may draft but not send, and cannot exceed the threshold without a decision.
              This gate is enforced by the graph, not the prompt.
            </p>

            <div className="flex gap-3">
              <button
                ref={rejectRef}
                onClick={() => onDecide("rejected")}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--color-border-bright)] py-2.5 text-sm font-semibold transition hover:bg-white/5 focus:ring-2 focus:ring-[var(--color-danger)] focus:outline-none"
              >
                <X size={16} /> Reject
              </button>
              <button
                onClick={() => onDecide("approved")}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-[#062016] transition hover:brightness-110 focus:ring-2 focus:ring-white focus:outline-none"
                style={{ background: "var(--color-success)" }}
              >
                <Check size={16} /> Approve override
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--color-muted)]">{label}</span>
      <span className="tabular font-mono font-medium" style={{ color: emphasize }}>
        {value}
      </span>
    </div>
  );
}
