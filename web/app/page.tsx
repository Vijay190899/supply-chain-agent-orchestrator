"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { ShaderBackground } from "@/components/ShaderBackground";
import { Manual } from "@/components/Manual";
import { Reveal } from "@/components/Reveal";
import { AgentPipeline, type Status } from "@/components/AgentPipeline";
import { EventLog, type LogLine } from "@/components/EventLog";
import { ApprovalModal } from "@/components/ApprovalModal";
import { ResultPanel } from "@/components/ResultPanel";
import { ScenarioPicker } from "@/components/ScenarioPicker";
import { runStream, resumeStream, IS_DEMO } from "@/lib/stream";
import { SCENARIOS } from "@/lib/scenarios";
import type { AgentId, ApprovalPayload, Decision, RunResult, StreamEvent } from "@/lib/types";

type Phase = "idle" | "running" | "awaiting" | "done" | "error";

const AGENT_IDS: AgentId[] = ["monitor", "optimizer", "human_approval", "communicator"];
const IDLE: Record<AgentId, Status> = {
  monitor: "idle",
  optimizer: "idle",
  human_approval: "idle",
  communicator: "idle",
};

export default function Home() {
  const [scenarioId, setScenarioId] = useState("suez-blockage");
  const [manualOpen, setManualOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [statuses, setStatuses] = useState<Record<AgentId, Status>>(IDLE);
  const [log, setLog] = useState<LogLine[]>([]);
  const [timings, setTimings] = useState<{ node: AgentId; ms: number }[]>([]);
  const [approval, setApproval] = useState<ApprovalPayload | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);

  const threadRef = useRef("");
  const logId = useRef(0);
  const scenario = SCENARIOS.find((s) => s.id === scenarioId)!;

  const pushLog = useCallback((agent: LogLine["agent"], texts: string[]) => {
    if (texts.length === 0) return;
    setLog((prev) => [...prev, ...texts.map((text) => ({ id: logId.current++, agent, text }))]);
  }, []);

  const handleEvent = useCallback(
    (e: StreamEvent) => {
      if (e.type === "run_started") {
        threadRef.current = e.thread_id;
        setStatuses({ ...IDLE, monitor: "active" });
      } else if (e.type === "resumed") {
        threadRef.current = e.thread_id;
      } else if (e.type === "node") {
        const data = e.data as { disruptions?: unknown[]; needs_approval?: boolean };
        setStatuses((prev) => {
          const next = { ...prev, [e.node]: "done" as Status };
          if (e.node === "monitor" && data.disruptions?.length) next.optimizer = "active";
          else if (e.node === "optimizer")
            next[data.needs_approval ? "human_approval" : "communicator"] = "active";
          else if (e.node === "human_approval") next.communicator = "active";
          return next;
        });
        pushLog(e.node, e.events);
        setTimings((prev) => [...prev, { node: e.node, ms: e.elapsed_ms }]);
      } else if (e.type === "await_approval") {
        threadRef.current = e.thread_id;
        setStatuses((prev) => ({ ...prev, human_approval: "active" }));
        setApproval(e.payload);
        setPhase("awaiting");
        pushLog("system", ["hold · human authority required on cost override"]);
      } else if (e.type === "done") {
        setResult(e.result);
        setStatuses((prev) => {
          const next = { ...prev };
          for (const id of AGENT_IDS) if (next[id] === "idle") next[id] = "skipped";
          return next;
        });
        setPhase("done");
      } else if (e.type === "error") {
        pushLog("system", [`fault: ${e.message}`]);
        setPhase("error");
      }
    },
    [pushLog],
  );

  const consume = useCallback(
    async (gen: AsyncGenerator<StreamEvent>) => {
      try {
        for await (const e of gen) handleEvent(e);
      } catch (err) {
        pushLog("system", [`link fault: ${(err as Error).message}`]);
        setPhase("error");
      }
    },
    [handleEvent, pushLog],
  );

  const start = useCallback(async () => {
    setPhase("running");
    setStatuses({ ...IDLE, monitor: "active" });
    setLog([]);
    setTimings([]);
    setResult(null);
    setApproval(null);
    logId.current = 0;
    await consume(runStream(scenarioId));
  }, [consume, scenarioId]);

  const decide = useCallback(
    async (decision: Decision) => {
      setApproval(null);
      setPhase("running");
      await consume(resumeStream(scenarioId, threadRef.current, decision));
    },
    [consume, scenarioId],
  );

  const reset = useCallback(() => {
    setPhase("idle");
    setStatuses(IDLE);
    setLog([]);
    setTimings([]);
    setResult(null);
    setApproval(null);
  }, []);

  const busy = phase === "running" || phase === "awaiting";
  const ranOnce = phase !== "idle";
  const energy = busy ? 1 : phase === "done" ? 0.35 : 0;

  return (
    <>
      <ShaderBackground energy={energy} />
      <main className="mx-auto w-full max-w-[1560px] px-6 py-12 sm:px-10 sm:py-16 xl:px-16 2xl:py-20">
        {/* top bar */}
        <Reveal className="mb-10 flex items-center justify-end gap-2">
          <button
            onClick={() => setManualOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-[var(--color-edge-2)] bg-white/[0.03] px-3.5 py-1.5 text-[12px] text-[var(--color-muted)] backdrop-blur transition-colors hover:text-[var(--color-ink)] focus-visible:outline-none"
          >
            <BookOpen size={13} /> How it works
          </button>
          <a
            href="https://github.com/Vijay190899/supply-chain-agent-orchestrator"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 rounded-full border border-[var(--color-edge-2)] bg-white/[0.03] px-3.5 py-1.5 text-[12px] text-[var(--color-muted)] backdrop-blur transition-colors hover:text-[var(--color-ink)]"
          >
            Source <ArrowUpRight size={12} />
          </a>
        </Reveal>

        {/* hero */}
        <Reveal delay={0.08}>
          <h1 className="serif leading-[1.02] tracking-tight text-[clamp(2.6rem,5.6vw,5.4rem)]">
            Four agents reroute the world.
            <br />
            <span className="grad italic">A human holds the line.</span>
          </h1>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-[var(--color-muted)] xl:text-[17px]">
            A multi-agent orchestrator responds to a supply-chain disruption in real time, and stops
            for a person the moment the fix runs expensive. Pick a scenario and watch it work.
          </p>
        </Reveal>

        {/* console */}
        <Reveal delay={0.24} className="mt-12">
          <div className="glass p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
              <div className="min-w-0 flex-1">
                <ScenarioPicker selected={scenarioId} onSelect={setScenarioId} disabled={busy} />
                <p className="mt-3 px-0.5 text-[13px] text-[var(--color-muted)]">{scenario.blurb}</p>
              </div>
              <div className="flex items-stretch gap-2 lg:flex-col lg:justify-center">
                <motion.button
                  onClick={start}
                  disabled={busy}
                  whileTap={busy ? undefined : { scale: 0.97 }}
                  className="btn-grad flex flex-1 items-center justify-center rounded-xl px-8 py-3.5 text-[14px] font-semibold text-[#0a0710] transition-[filter] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 lg:flex-none"
                >
                  {phase === "idle" ? "Run scenario" : busy ? "Working…" : "Run again"}
                </motion.button>
                {(phase === "done" || phase === "error") && (
                  <button
                    onClick={reset}
                    className="mono rounded-xl border border-[var(--color-edge-2)] px-4 text-[12px] text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)] focus-visible:outline-none"
                  >
                    reset
                  </button>
                )}
              </div>
            </div>
          </div>
        </Reveal>

        {/* pipeline */}
        <div className="mt-4">
          <AgentPipeline statuses={statuses} awaiting={phase === "awaiting"} />
        </div>

        {/* readout + feed */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <ResultPanel result={result} timings={timings} active={ranOnce} />
          </div>
          <div className="lg:col-span-5">
            <EventLog lines={log} live={busy} />
          </div>
        </div>

        <footer className="mt-14 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--color-edge)] pt-5 text-[12px] text-[var(--color-muted)]">
          <span className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: IS_DEMO ? "var(--color-warm)" : "var(--color-ok)" }}
            />
            {IS_DEMO ? "Running in demo mode" : "Live"}
          </span>
          <span className="text-[var(--color-faint)]">·</span>
          <span>A portfolio project by Vijay Ananth Karunanithi.</span>
          <button
            onClick={() => setManualOpen(true)}
            className="ml-auto text-[var(--color-muted)] underline-offset-4 transition-colors hover:text-[var(--color-ink)] hover:underline"
          >
            How it works
          </button>
        </footer>

        <ApprovalModal payload={approval} onDecide={decide} />
        <Manual open={manualOpen} onClose={() => setManualOpen(false)} />
      </main>
    </>
  );
}
