"use client";

import { useCallback, useRef, useState } from "react";
import { Play, RotateCcw, ArrowUpRight } from "lucide-react";
import { RadarBackground } from "@/components/RadarBackground";
import { RouteChart } from "@/components/RouteChart";
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
        pushLog("system", ["hold · master's authority required on cost override"]);
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
  const rerouted = statuses.optimizer === "done" && scenario.blocked;

  return (
    <>
      <RadarBackground />
      <main className="mx-auto max-w-[1160px] px-5 py-8 sm:px-8">
        <Header />

        {/* control bar */}
        <section className="panel mt-6 p-3.5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
            <div className="min-w-0 flex-1">
              <ScenarioPicker selected={scenarioId} onSelect={setScenarioId} disabled={busy} />
              <p className="mt-2 px-0.5 text-[12.5px] text-[var(--color-muted)]">{scenario.blurb}</p>
            </div>
            <div className="flex items-stretch gap-2 lg:flex-col lg:justify-center">
              <button
                onClick={start}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-2 rounded-[4px] px-6 py-3 text-[13px] font-semibold tracking-wide text-[#241300] uppercase transition-[filter] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 lg:flex-none"
                style={{ background: "var(--color-amber)" }}
              >
                <Play size={15} strokeWidth={2.5} />
                {phase === "idle" ? "Tasking" : busy ? "Working" : "Re-task"}
              </button>
              {(phase === "done" || phase === "error") && (
                <button
                  onClick={reset}
                  aria-label="Reset"
                  className="flex items-center justify-center rounded-[4px] border border-[var(--color-hair-2)] px-4 text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)] focus-visible:outline-none"
                >
                  <RotateCcw size={14} />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* hero: the lane chart */}
        <section className="mt-3">
          <RouteChart scenario={scenario} rerouted={rerouted} running={busy} />
        </section>

        {/* pipeline of watch stations */}
        <section className="mt-3">
          <AgentPipeline statuses={statuses} awaiting={phase === "awaiting"} />
        </section>

        {/* readout + notice feed */}
        <section className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <ResultPanel result={result} timings={timings} active={ranOnce} />
          </div>
          <div className="lg:col-span-5">
            <EventLog lines={log} live={busy} />
          </div>
        </section>

        <Footer />
        <ApprovalModal payload={approval} onDecide={decide} />
      </main>
    </>
  );
}

function Header() {
  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: IS_DEMO ? "var(--color-amber)" : "var(--color-nominal)" }}
          />
          <span className="kicker">
            {IS_DEMO ? "watch station · replay" : "watch station · live link"}
          </span>
        </div>
        <h1 className="font-[var(--font-display)] text-[30px] leading-none font-bold tracking-tight sm:text-[38px]">
          Disruption Console
        </h1>
        <p className="mt-2 max-w-lg text-[13.5px] text-[var(--color-muted)]">
          Vessel-traffic control for autonomous logistics agents. Four watch stations reroute a
          blocked shipping lane and hold for a human when the fix runs expensive.
        </p>
      </div>
      <a
        href="https://github.com/Vijay190899/supply-chain-agent-orchestrator"
        target="_blank"
        rel="noreferrer"
        className="flex shrink-0 items-center gap-1 rounded-[4px] border border-[var(--color-hair)] px-3 py-2 telemetry text-[11px] text-[var(--color-muted)] transition-colors hover:border-[var(--color-hair-2)] hover:text-[var(--color-text)]"
      >
        source <ArrowUpRight size={12} />
      </a>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-1 telemetry text-[10px] text-[var(--color-faint)]">
      <span>LANGGRAPH</span> · <span>MCP FEEDS</span> · <span>GUARDRAILS</span> ·{" "}
      <span>LANGFUSE</span> · <span>CREWAI BENCHMARK</span>
      <span className="ml-auto normal-case">
        the approval hold is a real graph interrupt, not a scripted pause
      </span>
    </footer>
  );
}
