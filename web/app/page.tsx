"use client";

import { useCallback, useRef, useState } from "react";
import { Play, RotateCcw, Code2, Radio, FlaskConical } from "lucide-react";
import { AgentPipeline, type Status } from "@/components/AgentPipeline";
import { EventLog, type LogLine } from "@/components/EventLog";
import { ApprovalModal } from "@/components/ApprovalModal";
import { ResultPanel } from "@/components/ResultPanel";
import { ScenarioPicker } from "@/components/ScenarioPicker";
import { runStream, resumeStream, IS_DEMO } from "@/lib/stream";
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
        pushLog("system", ["awaiting human decision on the cost override…"]);
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

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Header />

      <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionLabel>1 · Pick a disruption scenario</SectionLabel>
          <ScenarioPicker selected={scenario} onSelect={setScenario} disabled={busy} />
        </div>
        <div className="flex flex-col justify-end">
          <SectionLabel>2 · Run the agents</SectionLabel>
          <div className="glass flex flex-col gap-3 p-4">
            <button
              onClick={start}
              disabled={busy}
              className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] py-3 font-semibold text-[#06122b] transition hover:brightness-110 focus:ring-2 focus:ring-white focus:outline-none disabled:opacity-50"
            >
              <Play size={17} />
              {phase === "idle" ? "Run scenario" : busy ? "Running…" : "Run again"}
            </button>
            {(phase === "done" || phase === "error") && (
              <button
                onClick={reset}
                className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border-bright)] py-2.5 text-sm text-[var(--color-muted)] transition hover:text-[var(--color-text)] focus:outline-none"
              >
                <RotateCcw size={15} /> Reset
              </button>
            )}
            <p className="text-center text-[11px] text-[var(--color-faint)]">
              Status: <span className="tabular text-[var(--color-muted)]">{phase}</span>
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <SectionLabel>Agent pipeline</SectionLabel>
        <AgentPipeline statuses={statuses} />
      </section>

      <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <SectionLabel>Live event stream</SectionLabel>
          <EventLog lines={log} />
        </div>
        <div>
          <SectionLabel>Result</SectionLabel>
          <ResultPanel result={result} timings={timings} />
        </div>
      </section>

      <Footer />
      <ApprovalModal payload={approval} onDecide={decide} />
    </main>
  );
}

function Header() {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{
              background: IS_DEMO ? "var(--color-optimizer)1f" : "var(--color-success)1f",
              color: IS_DEMO ? "var(--color-optimizer)" : "var(--color-success)",
            }}
          >
            {IS_DEMO ? <FlaskConical size={12} /> : <Radio size={12} />}
            {IS_DEMO ? "demo mode" : "live backend"}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Disruption Console</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-muted)]">
          A multi-agent logistics orchestrator built on LangGraph. Watch it detect a supply-chain
          disruption, price reroute options, pause for a human on expensive overrides, and draft the
          customer notice, streamed live as the agents run.
        </p>
      </div>
      <a
        href="https://github.com/Vijay190899/supply-chain-agent-orchestrator"
        target="_blank"
        rel="noreferrer"
        className="glass glass-hover flex shrink-0 items-center gap-2 px-3 py-2 text-sm text-[var(--color-muted)]"
      >
        <Code2 size={16} /> Source
      </a>
    </header>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-xs font-semibold tracking-wider text-[var(--color-faint)] uppercase">
      {children}
    </h2>
  );
}

function Footer() {
  return (
    <footer className="mt-10 border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-faint)]">
      LangGraph · MCP tool feeds · action guardrails · Langfuse tracing · CrewAI comparison. The
      approval gate is a real graph interrupt, not a scripted pause.{" "}
      {IS_DEMO &&
        "Demo mode replays canned runs; point NEXT_PUBLIC_API_URL at the backend for live."}
    </footer>
  );
}
