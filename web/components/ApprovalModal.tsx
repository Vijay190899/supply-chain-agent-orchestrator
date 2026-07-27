"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ApprovalPayload, Decision } from "@/lib/types";

const CYAN = "var(--color-cyan)";

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
          <div className="absolute inset-0 bg-[#04070c]/75 backdrop-blur-[4px]" />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="auth-title"
            className="panel-lit relative w-full rounded-b-none rounded-t-lg p-5 sm:max-w-md sm:rounded-lg"
            style={{ borderColor: CYAN, boxShadow: `0 0 60px -20px ${CYAN}, 0 24px 64px -24px #000` }}
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ type: "spring", stiffness: 260, damping: 26, mass: 1.1 }}
          >
            <div className="mb-2 flex items-center gap-2">
              <motion.span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: CYAN }}
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ duration: 0.4 }}
              />
              <span className="kicker" style={{ color: CYAN }}>
                master&apos;s authority required
              </span>
            </div>
            <h2 id="auth-title" className="font-[var(--font-display)] text-[20px] font-semibold">
              Authorize the reroute?
            </h2>
            <p className="mt-1 text-[13px] text-[var(--color-muted)]">
              The optimizer&apos;s best plan exceeds the 15% cost ceiling. The watch cannot commit it
              without your ruling.
            </p>

            <div className="mt-4 space-y-2 border-y border-[var(--color-hair)] py-3">
              <Row label="route" value={payload.route_id} />
              <Row label="plan" value={payload.option} />
              <Row
                label="cost Δ"
                value={`+${Math.round(payload.cost_delta * 100)}%`}
                color="var(--color-rose)"
                big
              />
              <Row label="eta Δ" value={`+${payload.eta_delta_hours}h`} />
            </div>

            <div className="mt-4 flex gap-2.5">
              <button
                onClick={() => onDecide("rejected")}
                className="flex-1 rounded-[4px] border border-[var(--color-hair-2)] py-2.5 text-[13px] font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-rose)] focus-visible:outline-none"
              >
                Hold / reject
              </button>
              <button
                ref={approveRef}
                onClick={() => onDecide("approved")}
                className="flex-1 rounded-[4px] py-2.5 text-[13px] font-semibold text-[#04241f] transition-[filter] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                style={{ background: "var(--color-nominal)" }}
              >
                Authorize
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
    <div className="flex items-baseline justify-between">
      <span className="kicker">{label}</span>
      <span className="telemetry font-medium" style={{ color: color ?? "var(--color-text)", fontSize: big ? 18 : 13 }}>
        {value}
      </span>
    </div>
  );
}
