import type { AgentId } from "./types";

export type Scenario = {
  id: string;
  code: string; // route id, AIS-tag style
  title: string;
  origin: string;
  dest: string;
  choke: string; // the chokepoint name
  chokeAt: number; // 0..1 position of the chokepoint along the lane
  blocked: boolean;
  severity: "nominal" | "caution" | "critical";
  blurb: string;
};

/** Mirrors the backend fixtures in providers.py, with lane geography for the chart. */
export const SCENARIOS: Scenario[] = [
  {
    id: "clear",
    code: "R-330",
    title: "All clear",
    origin: "RTM",
    dest: "SIN",
    choke: "Suez",
    chokeAt: 0.52,
    blocked: false,
    severity: "nominal",
    blurb: "Lanes nominal. The monitor sweeps the feeds and finds nothing to act on.",
  },
  {
    id: "storm-north-sea",
    code: "R-201",
    title: "North Sea storm",
    origin: "HAM",
    dest: "OSL",
    choke: "Hamburg approach",
    chokeAt: 0.22,
    blocked: true,
    severity: "caution",
    blurb: "A storm suspends the Hamburg approach. A cheap hold keeps it under the approval bar.",
  },
  {
    id: "suez-blockage",
    code: "R-330",
    title: "Suez Canal blockage",
    origin: "RTM",
    dest: "SIN",
    choke: "Suez Canal",
    chokeAt: 0.52,
    blocked: true,
    severity: "critical",
    blurb: "A grounded vessel closes the canal. The best reroute breaks 15%, so a human decides.",
  },
];

/** Pipeline order, framed as watch-station roles. */
export const AGENTS: {
  id: AgentId;
  label: string;
  station: string;
  kind: "machine" | "human";
}[] = [
  { id: "monitor", label: "Monitor", station: "Radar watch", kind: "machine" },
  { id: "optimizer", label: "Optimizer", station: "Route planning", kind: "machine" },
  { id: "human_approval", label: "Approval", station: "Master's authority", kind: "human" },
  { id: "communicator", label: "Communicator", station: "Notice desk", kind: "machine" },
];
