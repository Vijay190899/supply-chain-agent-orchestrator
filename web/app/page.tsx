"use client";

import { useCallback, useRef, useState } from "react";
import { Play, RotateCcw, ArrowUpRight } from "lucide-react";
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
  const [scenario, setScenario] = useState("suez-blockage");
  const [phase, setPhase] = useState<Phase>("idle");
  const [statuses, setStatuses] = useState<Record<AgentId, Status>>(IDLE);
  const [log, setLog] = useState<LogLine[]>([]);
  const [timings, setTimings] = useState<{ node: AgentId; ms: number }[]>([]);
  const [approval, setApproval] = useState<ApprovalPayload | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);

  const threadRef = useRef("");
  const logId = useRef(0);

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
        pushLog("system", ["paused · awaiting human decision on cost override"]);
      } else if (e.type === "done") {
        setResult(e.result);
        setStatuses((prev) => {
          const next = { ...prev };
          for (const id of AGENT_IDS) if (next[id] === "idle") next[id] = "skipped";
          return next;
        });
        setPhase("done");
      } else if (e.type === "error") {
        pushLog("system", [`error: ${e.message}`]);
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
        pushLog("system", [`stream error: ${(err as Error).message}`]);
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
    await consume(runStream(scenario));
  }, [consume, scenario]);

  const decide = useCallback(
    async (decision: Decision) => {
      setApproval(null);
      setPhase("running");
      await consume(resumeStream(scenario, threadRef.current, decision));
    },
    [consume, scenario],
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
  const blurb = SCENARIOS.find((s) => s.id === scenario)?.blurb;

  return (
    <main className="mx-auto max-w-[1140px] px-5 py-10 sm:px-8">
      <Header />

      {/* control bar: scenario + run merged */}
      <section className="panel mt-8 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
          <div className="min-w-0 flex-1">
            <ScenarioPicker selected={scenario} onSelect={setScenario} disabled={busy} />
            {blurb && (
              <p className="mt-2.5 px-0.5 text-[12.5px] text-[var(--color-text-2)]">{blurb}</p>
            )}
          </div>
          <div className="flex items-center gap-2 lg:flex-col lg:items-stretch lg:justify-center">
            <button
              onClick={start}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-2 rounded-[8px] px-6 py-3 text-[14px] font-semibold text-[#241300] transition-[filter] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 lg:flex-none"
              style={{ background: "var(--color-machine)" }}
            >
              <Play size={16} strokeWidth={2.5} />
              {phase === "idle" ? "Run" : busy ? "Running" : "Run again"}
            </button>
            {(phase === "done" || phase === "error") && (
              <button
                onClick={reset}
                aria-label="Reset"
                className="flex items-center justify-center gap-1.5 rounded-[8px] border border-[var(--color-border-strong)] px-4 py-3 text-[13px] text-[var(--color-text-2)] transition-colors hover:text-[var(--color-text)] focus-visible:outline-none"
              >
                <RotateCcw size={14} /> Reset
              </button>
            )}
          </div>
        </div>
      </section>

      {/* focal: the pipeline */}
      <section className="mt-4">
        <AgentPipeline statuses={statuses} />
      </section>

      {/* results + live log */}
      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ResultPanel result={result} timings={timings} active={ranOnce} />
        </div>
        <div className="lg:col-span-5">
          <EventLog lines={log} />
        </div>
      </section>

      <Footer />
      <ApprovalModal payload={approval} onDecide={decide} />
    </main>
  );
}

function Header() {
  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <div className="mb-2 flex items-center gap-2 font-mono text-[11px]">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: IS_DEMO ? "var(--color-machine)" : "var(--color-success)" }}
          />
          <span className="text-[var(--color-faint)]">
            {IS_DEMO ? "demo mode · replayed runs" : "live · connected to backend"}
          </span>
        </div>
        <h1 className="text-[26px] font-semibold tracking-tight sm:text-[30px]">
          Disruption Console
        </h1>
        <p className="mt-1.5 max-w-xl text-[13.5px] text-[var(--color-text-2)]">
          Four LangGraph agents respond to a supply-chain disruption, and stop for a human when the
          fix gets expensive. Watch it run.
        </p>
      </div>
      <a
        href="https://github.com/Vijay190899/supply-chain-agent-orchestrator"
        target="_blank"
        rel="noreferrer"
        className="flex shrink-0 items-center gap-1 rounded-[8px] border border-[var(--color-border)] px-3 py-2 font-mono text-[12px] text-[var(--color-text-2)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
      >
        source <ArrowUpRight size={13} />
      </a>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-10 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11.5px] text-[var(--color-faint)]">
      <span>langgraph</span> · <span>mcp feeds</span> · <span>guardrails</span> ·{" "}
      <span>langfuse</span> · <span>crewai comparison</span>
      <span className="ml-auto">the approval gate is a real graph interrupt, not a scripted pause</span>
    </footer>
  );
}
