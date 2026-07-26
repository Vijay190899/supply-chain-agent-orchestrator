import type { AgentId } from "./types";

export type Scenario = {
  id: string;
  title: string;
  route: string;
  severity: "none" | "moderate" | "severe";
  blurb: string;
};

/** Mirrors the backend fixtures in providers.py. */
export const SCENARIOS: Scenario[] = [
  {
    id: "clear",
    title: "All clear",
    route: "no active disruptions",
    severity: "none",
    blurb: "Baseline. The monitor polls the feeds and finds nothing to act on.",
  },
  {
    id: "storm-north-sea",
    title: "North Sea storm",
    route: "R-201 · Hamburg → Oslo",
    severity: "moderate",
    blurb: "A storm suspends Hamburg port ops. A cheap reroute keeps it under the approval bar.",
  },
  {
    id: "suez-blockage",
    title: "Suez Canal blockage",
    route: "R-330 · Rotterdam → Singapore",
    severity: "severe",
    blurb: "A grounded vessel closes the canal. The best option breaks 15%, so a human decides.",
  },
];

export const AGENTS: { id: AgentId; label: string; role: string; color: string }[] = [
  { id: "monitor", label: "Monitor", role: "Detect disruptions", color: "var(--color-monitor)" },
  {
    id: "optimizer",
    label: "Optimizer",
    role: "Price reroute options",
    color: "var(--color-optimizer)",
  },
  {
    id: "human_approval",
    label: "Approval",
    role: "Human-in-the-loop gate",
    color: "var(--color-approval)",
  },
  {
    id: "communicator",
    label: "Communicator",
    role: "Draft customer notice",
    color: "var(--color-communicator)",
  },
];
