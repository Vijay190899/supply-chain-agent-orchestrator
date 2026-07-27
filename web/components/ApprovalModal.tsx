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
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-[#04050a]/70 backdrop-blur-[8px]" />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="auth-title"
            className="glass-2 relative w-full rounded-b-none rounded-t-2xl p-6 sm:max-w-md sm:rounded-2xl"
            style={{ borderColor: CYAN, boxShadow: `0 0 80px -24px ${CYAN}, 0 30px 80px -30px #000` }}
            initial={{ opacity: 0, scale: 0.95, y: 24, filter: "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.95, y: 24, filter: "blur(8px)" }}
            transition={{ type: "spring", stiffness: 240, damping: 24, mass: 1.1 }}
          >
            <div className="mb-2 flex items-center gap-2">
              <motion.span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: CYAN }}
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ duration: 0.4 }}
              />
              <span className="kicker" style={{ color: CYAN }}>
                human authority required
              </span>
            </div>
            <h2 id="auth-title" className="serif text-[30px] leading-tight">
              Authorize the reroute?
            </h2>
            <p className="mt-1.5 text-[13.5px] text-[var(--color-muted)]">
              The optimizer&apos;s best plan exceeds the 15% cost ceiling. The system holds until you
              rule.
            </p>

            <div className="mt-5 space-y-2.5 border-y border-[var(--color-edge)] py-4">
              <Row label="route" value={payload.route_id} />
              <Row label="plan" value={payload.option} />
              <Row
                label="cost delta"
                value={`+${Math.round(payload.cost_delta * 100)}%`}
                color="var(--color-rose)"
                big
              />
              <Row label="eta delta" value={`+${payload.eta_delta_hours}h`} />
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => onDecide("rejected")}
                className="flex-1 rounded-xl border border-[var(--color-edge-2)] py-2.5 text-[13.5px] font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)] focus-visible:ring-2 focus-visible:ring-[var(--color-rose)] focus-visible:outline-none"
              >
                Hold / reject
              </button>
              <button
                ref={approveRef}
                onClick={() => onDecide("approved")}
                className="flex-1 rounded-xl py-2.5 text-[13.5px] font-semibold text-[#042018] transition-[filter] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                style={{ background: "var(--color-ok)" }}
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
      <span className="mono font-medium" style={{ color: color ?? "var(--color-ink)", fontSize: big ? 19 : 13 }}>
        {value}
      </span>
    </div>
  );
}
