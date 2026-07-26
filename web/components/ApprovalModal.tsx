"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ApprovalPayload, Decision } from "@/lib/types";

const HUMAN = "var(--color-human)";

export function ApprovalModal({
  payload,
  onDecide,
}: {
  payload: ApprovalPayload | null;
  onDecide: (d: Decision) => void;
}) {
  const approveRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (payload) approveRef.current?.focus();
  }, [payload]);

  return (
    <AnimatePresence>
      {payload && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          {/* the only backdrop-blur in the app */}
          <div className="absolute inset-0 bg-[#06070a]/70 backdrop-blur-[6px]" />

          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="approval-title"
            className="panel-focal relative w-full rounded-b-none rounded-t-2xl p-6 sm:max-w-md sm:rounded-2xl"
            style={{ borderColor: HUMAN }}
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 24 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          >
            <div className="mb-1 flex items-center gap-2">
              <motion.span
                className="h-2 w-2 rounded-full"
                style={{ background: HUMAN }}
                animate={{ scale: [1, 1.35, 1] }}
                transition={{ duration: 0.4 }}
              />
              <span className="font-mono text-[11px] tracking-wide" style={{ color: HUMAN }}>
                human in the loop
              </span>
            </div>
            <h2 id="approval-title" className="text-[19px] font-semibold tracking-tight">
              Approve this override?
            </h2>
            <p className="mt-1 text-[13px] text-[var(--color-text-2)]">
              The optimizer&apos;s best option exceeds the 15% cost ceiling. The agents cannot
              proceed without your call.
            </p>

            <div className="mt-4 space-y-2.5 font-mono text-[13px]">
              <Row label="route" value={payload.route_id} />
              <Row label="option" value={payload.option} />
              <Row
                label="cost"
                value={`+${Math.round(payload.cost_delta * 100)}%`}
                color="var(--color-danger)"
                big
              />
              <Row label="eta" value={`+${payload.eta_delta_hours}h`} />
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => onDecide("rejected")}
                className="flex-1 rounded-[8px] border border-[var(--color-border-strong)] py-2.5 text-[14px] font-medium text-[var(--color-text-2)] transition-colors hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-danger)] focus-visible:outline-none"
              >
                Reject
              </button>
              <button
                ref={approveRef}
                onClick={() => onDecide("approved")}
                className="flex-1 rounded-[8px] py-2.5 text-[14px] font-semibold text-[#052018] transition-[filter] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                style={{ background: "var(--color-success)" }}
              >
                Approve
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
  color,
  big,
}: {
  label: string;
  value: string;
  color?: string;
  big?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between border-b border-[var(--color-border)] pb-2">
      <span className="text-[var(--color-faint)]">{label}</span>
      <span
        className="tabular font-medium"
        style={{ color: color ?? "var(--color-text)", fontSize: big ? 18 : 13 }}
      >
        {value}
      </span>
    </div>
  );
}
