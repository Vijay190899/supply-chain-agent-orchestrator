export type AgentId = "monitor" | "optimizer" | "human_approval" | "communicator";

export type RouteOption = {
  route_id: string;
  label: string;
  description: string;
  cost_delta: number;
  eta_delta_hours: number;
};

export type ApprovalPayload = {
  reason: string;
  route_id: string;
  option: string;
  cost_delta: number;
  eta_delta_hours: number;
};

export type RunResult = {
  events: string[];
  chosen_option: RouteOption | null;
  customer_message: string | null;
  approval_decision: "approved" | "rejected" | null;
};

/** One NDJSON line from the backend stream. */
export type StreamEvent =
  | { type: "run_started" | "resumed"; scenario: string; thread_id: string }
  | {
      type: "node";
      node: AgentId;
      elapsed_ms: number;
      events: string[];
      data: Record<string, unknown>;
    }
  | { type: "await_approval"; thread_id: string; payload: ApprovalPayload }
  | { type: "done"; result: RunResult }
  | { type: "error"; message: string };

export type Decision = "approved" | "rejected";
