"""Scenario data providers.

These stand in for the external weather / news / logistics APIs. Each scenario
is a named, deterministic fixture so runs are reproducible and testable. The
plan is to move these behind MCP servers; the interface here (poll_disruptions,
route_options) is what those servers will expose.
"""

from supplyagents.state import Disruption, Route, RouteOption

ACTIVE_ROUTES: list[Route] = [
    {
        "route_id": "R-201",
        "origin": "Hamburg",
        "destination": "Oslo",
        "mode": "sea",
        "customer_segment": "smb",
        "base_cost_eur": 18_500.0,
    },
    {
        "route_id": "R-330",
        "origin": "Rotterdam",
        "destination": "Singapore",
        "mode": "sea",
        "customer_segment": "enterprise",
        "base_cost_eur": 142_000.0,
    },
]

_SCENARIO_DISRUPTIONS: dict[str, list[Disruption]] = {
    "clear": [],
    "storm-north-sea": [
        {
            "route_id": "R-201",
            "kind": "weather",
            "severity": "moderate",
            "description": "Storm over the North Sea, Hamburg port operations suspended 24h.",
        }
    ],
    "suez-blockage": [
        {
            "route_id": "R-330",
            "kind": "blockage",
            "severity": "severe",
            "description": "Vessel grounded in the Suez Canal, transit closed indefinitely.",
        }
    ],
}

_SCENARIO_OPTIONS: dict[str, list[RouteOption]] = {
    "storm-north-sea": [
        {
            "route_id": "R-201",
            "label": "rail-fallback",
            "description": "Shift cargo to rail via Copenhagen until port operations resume.",
            "cost_delta": 0.09,
            "eta_delta_hours": 18,
        },
        {
            "route_id": "R-201",
            "label": "hold-and-wait",
            "description": "Hold in Hamburg and depart after the storm window.",
            "cost_delta": 0.02,
            "eta_delta_hours": 36,
        },
    ],
    "suez-blockage": [
        {
            "route_id": "R-330",
            "label": "air-freight-partial",
            "description": "Air-freight priority containers, rest via Cape of Good Hope.",
            "cost_delta": 0.22,
            "eta_delta_hours": 48,
        },
        {
            "route_id": "R-330",
            "label": "cape-reroute-full",
            "description": "Full reroute via Cape of Good Hope.",
            "cost_delta": 0.18,
            "eta_delta_hours": 216,
        },
    ],
}


def known_scenarios() -> list[str]:
    return sorted(_SCENARIO_DISRUPTIONS)


def poll_disruptions(scenario: str) -> list[Disruption]:
    """What the monitor agent sees when it polls the external feeds."""
    try:
        return _SCENARIO_DISRUPTIONS[scenario]
    except KeyError:
        raise ValueError(f"Unknown scenario {scenario!r}. Known: {known_scenarios()}") from None


def route_options(scenario: str) -> list[RouteOption]:
    """Candidate replanning options the optimizer can price for a scenario."""
    return _SCENARIO_OPTIONS.get(scenario, [])
