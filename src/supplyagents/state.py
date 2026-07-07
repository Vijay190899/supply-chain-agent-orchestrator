"""Shared state for the orchestrator graph.

The whole workflow reads and writes one state object. Nodes return partial
updates; LangGraph merges them. The `events` field is an append-only audit
trail (operator.add reducer), which doubles as the run's human-readable log.
"""

import operator
from typing import Annotated, Literal, TypedDict


class Route(TypedDict):
    route_id: str
    origin: str
    destination: str
    mode: Literal["sea", "road", "rail", "air"]
    customer_segment: Literal["enterprise", "smb"]
    base_cost_eur: float


class Disruption(TypedDict):
    route_id: str
    kind: Literal["weather", "customs", "strike", "blockage"]
    severity: Literal["low", "moderate", "severe"]
    description: str


class RouteOption(TypedDict):
    route_id: str
    label: str
    description: str
    # Cost delta as a fraction of the route's base cost (0.22 means +22%).
    cost_delta: float
    eta_delta_hours: int


class OrchestratorState(TypedDict, total=False):
    scenario: str
    routes: list[Route]
    disruptions: list[Disruption]
    options: list[RouteOption]
    chosen_option: RouteOption | None
    # True when the chosen option's cost delta exceeds the approval threshold.
    needs_approval: bool
    approval_decision: Literal["approved", "rejected"] | None
    customer_message: str
    events: Annotated[list[str], operator.add]
