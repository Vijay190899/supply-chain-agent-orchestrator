"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export function Manual({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-[#04050a]/70 backdrop-blur-[8px]"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-title"
            className="glass-2 relative flex max-h-[85vh] w-full flex-col rounded-b-none rounded-t-3xl sm:max-w-lg sm:rounded-3xl"
            initial={{ opacity: 0, scale: 0.96, y: 24, filter: "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.96, y: 24, filter: "blur(8px)" }}
            transition={{ type: "spring", stiffness: 240, damping: 26, mass: 1.05 }}
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-3">
              <span className="kicker">field manual</span>
              <button
                onClick={onClose}
                aria-label="Close"
                className="text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)] focus-visible:outline-none"
              >
                <X size={18} />
              </button>
            </div>

            <div className="thin-scroll overflow-y-auto px-6 pb-7">
              <h2 id="manual-title" className="serif text-[28px] leading-tight">
                What you&apos;re looking at
              </h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--color-muted)]">
                A live demo of a multi-agent logistics orchestrator. When a shipping lane is
                disrupted, four AI agents respond in sequence, and the system stops for a human the
                moment the fix runs expensive. It is a real graph, not a scripted animation.
              </p>

              <Section title="How to use it">
                <ol className="list-decimal space-y-1.5 pl-4">
                  <li>Pick a disruption scenario from the three options.</li>
                  <li>
                    Press <span className="text-[var(--color-ink)]">Run scenario</span>.
                  </li>
                  <li>Watch the four agents work in order; the feed streams what each one does.</li>
                  <li>
                    On the severe scenario the best reroute breaks a 15% cost ceiling, so the run
                    pauses and asks you to <span className="text-[var(--color-cyan)]">Authorize</span>{" "}
                    or <span className="text-[var(--color-rose)]">Hold / reject</span>.
                  </li>
                  <li>See the drafted customer notice, the ruling, and per-agent latency.</li>
                </ol>
              </Section>

              <Section title="The four agents">
                <ul className="space-y-1.5">
                  <ManItem name="Monitor" desc="detects the disruption on the active routes" />
                  <ManItem name="Optimizer" desc="prices the reroute options and picks one" />
                  <ManItem name="Approval" desc="the human-in-the-loop gate for expensive overrides" />
                  <ManItem name="Communicator" desc="drafts the customer notice" />
                </ul>
              </Section>

              <Section title="Under the hood">
                <p className="text-[13px] leading-relaxed text-[var(--color-muted)]">
                  Built on LangGraph, where the approval gate is a genuine graph interrupt that
                  checkpoints the run and resumes on your decision. Tool feeds are exposed over MCP,
                  actions pass through guardrails, runs are traced with Langfuse, and there is a
                  written LangGraph-vs-CrewAI benchmark in the repo. This page runs in demo mode
                  (replayed runs) unless it is pointed at the live backend.
                </p>
              </Section>

              <a
                href="https://github.com/Vijay190899/supply-chain-agent-orchestrator"
                target="_blank"
                rel="noreferrer"
                className="mono mt-5 inline-block text-[12px] text-[var(--color-cyan)] transition-colors hover:brightness-125"
              >
                view the source on github →
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 border-t border-[var(--color-edge)] pt-4">
      <div className="kicker mb-2">{title}</div>
      <div className="text-[13px] leading-relaxed text-[var(--color-muted)]">{children}</div>
    </div>
  );
}

function ManItem({ name, desc }: { name: string; desc: string }) {
  return (
    <li className="flex gap-2.5">
      <span className="serif w-28 shrink-0 text-[15px] text-[var(--color-ink)]">{name}</span>
      <span>{desc}</span>
    </li>
  );
}
