"""Agent nodes for the orchestrator graph.

Each node is a plain function over the shared state. The communicator has two
modes: a deterministic template (no API key needed, used in tests and CI) and
an LLM-drafted version when OPENAI_API_KEY is set. Both go through the same
guardrail validation, which is the point: the safety layer doesn't care who
wrote the text.
"""

from supplyagents.config import get_settings
from supplyagents.feeds import Feed, LocalFeed
from supplyagents.guardrails import (
    check_action,
    requires_human_approval,
    validate_customer_message,
)
from supplyagents.state import OrchestratorState, Route, RouteOption


def monitor(state: OrchestratorState, *, feed: Feed | None = None) -> dict:
    """Poll external feeds for disruptions on the active routes."""
    check_action("monitor.poll")
    feed = feed or LocalFeed()
    scenario = state["scenario"]
    disruptions = feed.poll_disruptions(scenario)
    if not disruptions:
        event = f"monitor: polled scenario {scenario!r}, no disruptions on active routes"
    else:
        summary = "; ".join(f"{d['route_id']} {d['kind']} ({d['severity']})" for d in disruptions)
        event = f"monitor: detected {summary}"
    return {
        "routes": feed.active_routes(),
        "disruptions": disruptions,
        "events": [event],
    }


def optimizer(state: OrchestratorState, *, feed: Feed | None = None) -> dict:
    """Price the replanning options and recommend one.

    Recommendation rule: cheapest option whose ETA impact stays under 72 hours;
    if nothing qualifies, cheapest overall. Deliberately simple and legible,
    the interesting part is what happens to the recommendation downstream.
    """
    check_action("optimizer.propose")
    feed = feed or LocalFeed()
    options = feed.route_options(state["scenario"])
    if not options:
        return {"options": [], "chosen_option": None, "needs_approval": False, "events": []}

    viable = [o for o in options if o["eta_delta_hours"] <= 72]
    pool = viable or options
    chosen = min(pool, key=lambda o: o["cost_delta"])

    threshold = get_settings().human_approval_threshold
    needs_approval = requires_human_approval(chosen, threshold)

    event = (
        f"optimizer: recommends {chosen['label']!r} for {chosen['route_id']} "
        f"(cost {chosen['cost_delta']:+.0%}, ETA {chosen['eta_delta_hours']:+d}h), "
        f"approval {'required' if needs_approval else 'not required'} "
        f"(threshold {threshold:.0%})"
    )
    return {
        "options": options,
        "chosen_option": chosen,
        "needs_approval": needs_approval,
        "events": [event],
    }


def communicator(state: OrchestratorState) -> dict:
    """Draft the customer notification. Draft only; sending is not allowlisted."""
    check_action("communicator.draft")

    disruption = state["disruptions"][0]
    route = _route_by_id(state["routes"], disruption["route_id"])
    option = state.get("chosen_option")
    rejected = state.get("approval_decision") == "rejected"

    if option is None or rejected:
        message = _draft_delay_notice(route, disruption["description"])
        event_suffix = "delay notice (no replanning applied)"
    else:
        message = _draft_reroute_notice(route, disruption["description"], option)
        event_suffix = f"reroute notice for option {option['label']!r}"

    if _llm_enabled():
        message = _redraft_with_llm(message, route)

    validate_customer_message(message, route["route_id"])
    return {
        "customer_message": message,
        "events": [f"communicator: drafted {event_suffix} ({route['customer_segment']} tone)"],
    }


def _route_by_id(routes: list[Route], route_id: str) -> Route:
    for route in routes:
        if route["route_id"] == route_id:
            return route
    raise ValueError(f"No active route with id {route_id!r}")


def _draft_reroute_notice(route: Route, cause: str, option: RouteOption) -> str:
    eta = option["eta_delta_hours"]
    if route["customer_segment"] == "enterprise":
        return (
            f"Subject: Shipment update, route {route['route_id']} "
            f"({route['origin']} to {route['destination']})\n\n"
            f"Dear customer,\n\n"
            f"An operational disruption is affecting your shipment: {cause}\n\n"
            f"We have replanned as follows: {option['description']} "
            f"The revised estimated arrival shifts by {eta} hours. "
            f"Your account team will confirm the updated schedule within the next business day.\n\n"
            f"Kind regards\nLogistics Operations"
        )
    return (
        f"Subject: Update on your shipment (route {route['route_id']})\n\n"
        f"Hi,\n\n"
        f"Quick update: {cause}\n\n"
        f"Good news, we already have a plan: {option['description']} "
        f"Expect a delay of roughly {eta} hours against the original schedule. "
        f"We'll keep you posted if anything changes.\n\n"
        f"Thanks for your patience,\nYour logistics team"
    )


def _draft_delay_notice(route: Route, cause: str) -> str:
    return (
        f"Subject: Delay notice, route {route['route_id']} "
        f"({route['origin']} to {route['destination']})\n\n"
        f"Dear customer,\n\n"
        f"An operational disruption is affecting your shipment: {cause}\n\n"
        f"The shipment will proceed on its original routing once conditions allow. "
        f"We will follow up with a revised arrival estimate as soon as it is confirmed.\n\n"
        f"Kind regards\nLogistics Operations"
    )


def _llm_enabled() -> bool:
    return bool(get_settings().openai_api_key)


def _redraft_with_llm(template_draft: str, route: Route) -> str:
    """Ask an LLM to polish the template draft without changing the facts.

    The template output is the source of truth for facts; the model only
    adjusts tone. Guardrail validation still runs on whatever comes back.
    """
    from langchain_openai import ChatOpenAI

    settings = get_settings()
    llm = ChatOpenAI(
        model=settings.llm_model,
        temperature=0.3,
        api_key=settings.openai_api_key,
        base_url=settings.openai_base_url or None,
    )
    prompt = (
        "Rewrite the following logistics notification so it reads naturally for a "
        f"{route['customer_segment']} customer. Keep every fact, figure, and the route id "
        f"{route['route_id']} exactly as given. Do not add promises or new information.\n\n"
        f"{template_draft}"
    )
    response = llm.invoke(prompt)
    return str(response.content)
