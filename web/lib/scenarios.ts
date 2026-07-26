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
    blurb: "A storm suspends Hamburg port ops. A cheap reroute stays under the approval bar.",
  },
  {
    id: "suez-blockage",
    title: "Suez Canal blockage",
    route: "R-330 · Rotterdam → Singapore",
    severity: "severe",
    blurb: "A grounded vessel closes the canal. The best option breaks 15%, so a human decides.",
  },
];

/** Pipeline order. The human_approval node is the one human-in-the-loop step;
    everything else is autonomous machine work. */
export const AGENTS: { id: AgentId; label: string; role: string; kind: "machine" | "human" }[] = [
  { id: "monitor", label: "Monitor", role: "Detect disruptions", kind: "machine" },
  { id: "optimizer", label: "Optimizer", role: "Price reroute options", kind: "machine" },
  { id: "human_approval", label: "Approval", role: "Human decides", kind: "human" },
  { id: "communicator", label: "Communicator", role: "Draft customer notice", kind: "machine" },
];
