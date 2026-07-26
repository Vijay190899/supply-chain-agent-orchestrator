import type { Decision, StreamEvent } from "./types";

/** Canned event scripts for browser demo mode (no backend).
 *
 * These mirror the backend's deterministic scenario fixtures and template
 * messages exactly, so the demo is faithful. With a live backend the
 * customer messages are LLM-drafted instead of these templates.
 */

type Script = {
  start: StreamEvent[];
  resume: Record<Decision, StreamEvent[]>;
};

const ROUTES = [
  {
    route_id: "R-201",
    origin: "Hamburg",
    destination: "Oslo",
    mode: "sea",
    customer_segment: "smb",
    base_cost_eur: 18500,
  },
  {
    route_id: "R-330",
    origin: "Rotterdam",
    destination: "Singapore",
    mode: "sea",
    customer_segment: "enterprise",
    base_cost_eur: 142000,
  },
];

const SUEZ_OPTION = {
  route_id: "R-330",
  label: "air-freight-partial",
  description: "Air-freight priority containers, rest via Cape of Good Hope.",
  cost_delta: 0.22,
  eta_delta_hours: 48,
};

const STORM_OPTION = {
  route_id: "R-201",
  label: "hold-and-wait",
  description: "Hold in Hamburg and depart after the storm window.",
  cost_delta: 0.02,
  eta_delta_hours: 36,
};

const SUEZ_REROUTE_MSG = `Subject: Shipment update, route R-330 (Rotterdam to Singapore)

Dear customer,

An operational disruption is affecting your shipment: Vessel grounded in the Suez Canal, transit closed indefinitely.

We have replanned as follows: Air-freight priority containers, rest via Cape of Good Hope. The revised estimated arrival shifts by 48 hours. Your account team will confirm the updated schedule within the next business day.

Kind regards
Logistics Operations`;

const SUEZ_DELAY_MSG = `Subject: Delay notice, route R-330 (Rotterdam to Singapore)

Dear customer,

An operational disruption is affecting your shipment: Vessel grounded in the Suez Canal, transit closed indefinitely.

The shipment will proceed on its original routing once conditions allow. We will follow up with a revised arrival estimate as soon as it is confirmed.

Kind regards
Logistics Operations`;

const STORM_MSG = `Subject: Update on your shipment (route R-201)

Hi,

Quick update: Storm over the North Sea, Hamburg port operations suspended 24h.

Good news, we already have a plan: Hold in Hamburg and depart after the storm window. Expect a delay of roughly 36 hours against the original schedule. We'll keep you posted if anything changes.

Thanks for your patience,
Your logistics team`;

const THREAD = "demo-000000";

export const DEMO_SCRIPTS: Record<string, Script> = {
  clear: {
    start: [
      { type: "run_started", scenario: "clear", thread_id: THREAD },
      {
        type: "node",
        node: "monitor",
        elapsed_ms: 3.2,
        events: ["monitor: polled scenario 'clear', no disruptions on active routes"],
        data: { routes: ROUTES, disruptions: [] },
      },
      {
        type: "done",
        result: {
          events: ["monitor: polled scenario 'clear', no disruptions on active routes"],
          chosen_option: null,
          customer_message: null,
          approval_decision: null,
        },
      },
    ],
    resume: { approved: [], rejected: [] },
  },

  "storm-north-sea": {
    start: [
      { type: "run_started", scenario: "storm-north-sea", thread_id: THREAD },
      {
        type: "node",
        node: "monitor",
        elapsed_ms: 3.6,
        events: ["monitor: detected R-201 weather (moderate)"],
        data: {
          routes: ROUTES,
          disruptions: [
            {
              route_id: "R-201",
              kind: "weather",
              severity: "moderate",
              description: "Storm over the North Sea, Hamburg port operations suspended 24h.",
            },
          ],
        },
      },
      {
        type: "node",
        node: "optimizer",
        elapsed_ms: 2.4,
        events: [
          "optimizer: recommends 'hold-and-wait' for R-201 (cost +2%, ETA +36h), approval not required (threshold 15%)",
        ],
        data: { chosen_option: STORM_OPTION, needs_approval: false },
      },
      {
        type: "node",
        node: "communicator",
        elapsed_ms: 1400,
        events: ["communicator: drafted reroute notice for option 'hold-and-wait' (smb tone)"],
        data: { customer_message: STORM_MSG },
      },
      {
        type: "done",
        result: {
          events: [],
          chosen_option: STORM_OPTION,
          customer_message: STORM_MSG,
          approval_decision: null,
        },
      },
    ],
    resume: { approved: [], rejected: [] },
  },

  "suez-blockage": {
    start: [
      { type: "run_started", scenario: "suez-blockage", thread_id: THREAD },
      {
        type: "node",
        node: "monitor",
        elapsed_ms: 3.9,
        events: ["monitor: detected R-330 blockage (severe)"],
        data: {
          routes: ROUTES,
          disruptions: [
            {
              route_id: "R-330",
              kind: "blockage",
              severity: "severe",
              description: "Vessel grounded in the Suez Canal, transit closed indefinitely.",
            },
          ],
        },
      },
      {
        type: "node",
        node: "optimizer",
        elapsed_ms: 2.6,
        events: [
          "optimizer: recommends 'air-freight-partial' for R-330 (cost +22%, ETA +48h), approval required (threshold 15%)",
        ],
        data: { chosen_option: SUEZ_OPTION, needs_approval: true },
      },
      {
        type: "await_approval",
        thread_id: THREAD,
        payload: {
          reason: "cost override exceeds approval threshold",
          route_id: "R-330",
          option: "air-freight-partial",
          cost_delta: 0.22,
          eta_delta_hours: 48,
        },
      },
    ],
    resume: {
      approved: [
        { type: "resumed", scenario: "suez-blockage", thread_id: THREAD },
        {
          type: "node",
          node: "human_approval",
          elapsed_ms: 1.2,
          events: ["human_approval: override approved for option 'air-freight-partial'"],
          data: { approval_decision: "approved" },
        },
        {
          type: "node",
          node: "communicator",
          elapsed_ms: 1500,
          events: [
            "communicator: drafted reroute notice for option 'air-freight-partial' (enterprise tone)",
          ],
          data: { customer_message: SUEZ_REROUTE_MSG },
        },
        {
          type: "done",
          result: {
            events: [],
            chosen_option: SUEZ_OPTION,
            customer_message: SUEZ_REROUTE_MSG,
            approval_decision: "approved",
          },
        },
      ],
      rejected: [
        { type: "resumed", scenario: "suez-blockage", thread_id: THREAD },
        {
          type: "node",
          node: "human_approval",
          elapsed_ms: 1.3,
          events: ["human_approval: override rejected for option 'air-freight-partial'"],
          data: { approval_decision: "rejected" },
        },
        {
          type: "node",
          node: "communicator",
          elapsed_ms: 1500,
          events: ["communicator: drafted delay notice (no replanning applied) (enterprise tone)"],
          data: { customer_message: SUEZ_DELAY_MSG },
        },
        {
          type: "done",
          result: {
            events: [],
            chosen_option: SUEZ_OPTION,
            customer_message: SUEZ_DELAY_MSG,
            approval_decision: "rejected",
          },
        },
      ],
    },
  },
};
