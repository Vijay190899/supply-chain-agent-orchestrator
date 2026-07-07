"""The same disruption workflow, expressed as a CrewAI crew.

This mirrors the LangGraph orchestrator for the comparison in
docs/COMPARISON.md: same feeds, same guardrails, same approval threshold.

The structural differences worth noticing:

- Every agent here reasons through an LLM. In the LangGraph version the
  monitor and optimizer are plain code and only the communicator may call
  a model. That difference shows up directly in token cost and latency.
- CrewAI has no durable pause/resume, so the human-approval gate cannot
  live inside the crew. It is implemented as plain Python between two
  kickoffs (phase 1 recommends, phase 2 communicates). In LangGraph the
  gate is a checkpointed interrupt inside the graph.
- The approval decision itself stays in code either way: the threshold
  check is never delegated to a model.

Running the crew requires OPENAI_API_KEY. Construction does not.
"""

import json
import time
from dataclasses import dataclass, field

from crewai import LLM, Agent, Crew, Process, Task
from crewai.tools import tool
from pydantic import BaseModel

from supplyagents.config import get_settings
from supplyagents.feeds import LocalFeed
from supplyagents.guardrails import validate_customer_message

_feed = LocalFeed()


def _build_llm() -> LLM:
    """LLM from settings: OpenAI by default, any compatible endpoint otherwise."""
    settings = get_settings()
    return LLM(
        model=f"openai/{settings.llm_model}",
        api_key=settings.openai_api_key or None,
        base_url=settings.openai_base_url or None,
    )


# --- tools (same data the LangGraph nodes see) -------------------------------


@tool("get_active_routes")
def get_active_routes() -> str:
    """List the active shipping routes under management, as JSON."""
    return json.dumps(_feed.active_routes())


@tool("poll_disruptions")
def poll_disruptions(scenario: str) -> str:
    """Report current disruptions for a named scenario, as JSON."""
    return json.dumps(_feed.poll_disruptions(scenario))


@tool("get_route_options")
def get_route_options(scenario: str) -> str:
    """Priced replanning options for a scenario, as JSON. Cost deltas are fractions."""
    return json.dumps(_feed.route_options(scenario))


# --- structured output for phase 1 ------------------------------------------


class Recommendation(BaseModel):
    route_id: str
    label: str
    description: str
    cost_delta: float
    eta_delta_hours: int
    disruption_summary: str


# --- crew construction (no LLM call happens here) ----------------------------


def build_assessment_crew() -> Crew:
    """Phase 1: detect the disruption and recommend a replanning option."""
    llm = _build_llm()
    monitor = Agent(
        role="Logistics Monitor",
        goal="Detect disruptions affecting the active shipping routes.",
        backstory=(
            "You watch weather, news, and logistics feeds for a freight operator "
            "and report disruptions factually, without speculation."
        ),
        tools=[get_active_routes, poll_disruptions],
        llm=llm,
        verbose=False,
    )
    optimizer = Agent(
        role="Route Optimizer",
        goal="Recommend the most sensible replanning option for a disrupted route.",
        backstory=(
            "You price rerouting options for disrupted freight. You prefer the "
            "cheapest option whose ETA impact stays under 72 hours; if none "
            "qualifies, the cheapest overall."
        ),
        tools=[get_route_options],
        llm=llm,
        verbose=False,
    )
    detect = Task(
        description=(
            "Check for disruptions in scenario '{scenario}'. List the affected "
            "route ids and describe each disruption in one sentence."
        ),
        expected_output="A factual summary of current disruptions and affected routes.",
        agent=monitor,
    )
    recommend = Task(
        description=(
            "For scenario '{scenario}', fetch the replanning options and recommend "
            "one, following your selection rule. Report its exact route_id, label, "
            "description, cost_delta (fraction) and eta_delta_hours from the data; "
            "do not invent values."
        ),
        expected_output="The chosen option with its exact figures and a one-line rationale.",
        agent=optimizer,
        context=[detect],
        output_pydantic=Recommendation,
    )
    return Crew(
        agents=[monitor, optimizer],
        tasks=[detect, recommend],
        process=Process.sequential,
        verbose=False,
    )


def build_communication_crew() -> Crew:
    """Phase 2: draft the customer notification for the decided plan."""
    llm = _build_llm()
    communicator = Agent(
        role="Customer Communicator",
        goal="Draft clear, honest customer notifications about shipment changes.",
        backstory=(
            "You write shipment notifications for a freight operator. Enterprise "
            "customers get a formal tone, SMB customers a friendly one. You never "
            "reveal internal costs or margins and never promise what is not decided."
        ),
        llm=llm,
        verbose=False,
    )
    draft = Task(
        description=(
            "Draft a notification for the customer on route {route_id} "
            "({segment} segment). Situation: {situation}. Decided plan: {plan}. "
            "The message must mention the route id {route_id} exactly and must "
            "not mention internal costs, margins, or approval thresholds."
        ),
        expected_output="The customer-ready notification text, subject line included.",
        agent=communicator,
    )
    return Crew(agents=[communicator], tasks=[draft], process=Process.sequential, verbose=False)


# --- the workflow: two kickoffs around a code-level approval gate ------------


@dataclass
class CrewRunResult:
    scenario: str
    recommendation: Recommendation | None
    needs_approval: bool
    approval_decision: str | None
    customer_message: str | None
    phase_seconds: dict[str, float] = field(default_factory=dict)
    usage: dict[str, int] = field(default_factory=dict)


def run_workflow(scenario: str, decision: str = "approved") -> CrewRunResult:
    """Run the full workflow: assess, gate on the threshold, communicate.

    `decision` is applied only if the recommendation exceeds the approval
    threshold, mirroring the CLI's --approve/--reject flags.
    """
    settings = get_settings()
    result = CrewRunResult(
        scenario=scenario,
        recommendation=None,
        needs_approval=False,
        approval_decision=None,
        customer_message=None,
    )

    t0 = time.perf_counter()
    assessment = build_assessment_crew().kickoff(inputs={"scenario": scenario})
    result.phase_seconds["assessment"] = time.perf_counter() - t0
    _add_usage(result, assessment)

    disruptions = _feed.poll_disruptions(scenario)
    if not disruptions:
        return result

    recommendation: Recommendation = assessment.pydantic
    result.recommendation = recommendation
    result.needs_approval = recommendation.cost_delta > settings.human_approval_threshold

    # The gate lives here, in plain Python between kickoffs. CrewAI cannot
    # park a half-finished crew on a checkpoint the way LangGraph can.
    if result.needs_approval:
        result.approval_decision = decision

    route = next(r for r in _feed.active_routes() if r["route_id"] == recommendation.route_id)
    if result.approval_decision == "rejected":
        plan = "Keep the original routing; depart once conditions allow."
    else:
        plan = recommendation.description

    t0 = time.perf_counter()
    communication = build_communication_crew().kickoff(
        inputs={
            "route_id": route["route_id"],
            "segment": route["customer_segment"],
            "situation": recommendation.disruption_summary,
            "plan": plan,
        }
    )
    result.phase_seconds["communication"] = time.perf_counter() - t0
    _add_usage(result, communication)

    message = communication.raw
    # Same guardrail as the LangGraph path: framework choice does not change
    # the safety layer.
    validate_customer_message(message, route["route_id"])
    result.customer_message = message
    return result


def _add_usage(result: CrewRunResult, crew_output) -> None:
    metrics = getattr(crew_output, "token_usage", None)
    if metrics is None:
        return
    for key in ("total_tokens", "prompt_tokens", "completion_tokens", "successful_requests"):
        value = getattr(metrics, key, 0) or 0
        result.usage[key] = result.usage.get(key, 0) + int(value)
