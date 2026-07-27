"""Behavioral invariants: the business rules that must ALWAYS hold.

This is the honest form of "evals" for an agent system: not an LLM-quality
score, but deterministic assertions on the decisions the system makes. These
are the rules a production operator relies on, and they run keyless in CI. Run
with `make eval`.
"""

from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command

from supplyagents.graph import build_graph
from supplyagents.guardrails import (
    GuardrailViolation,
    check_action,
    requires_human_approval,
    validate_customer_message,
)
from supplyagents.state import RouteOption


def _option(cost_delta: float, eta: int = 24) -> RouteOption:
    return {
        "route_id": "R-330",
        "label": "x",
        "description": "x",
        "cost_delta": cost_delta,
        "eta_delta_hours": eta,
    }


def _run(scenario: str, thread: str):
    graph = build_graph(MemorySaver())
    cfg = {"configurable": {"thread_id": thread}}
    return graph, cfg, graph.invoke({"scenario": scenario, "events": []}, cfg)


# --- invariant 1: the approval gate triggers iff cost Δ exceeds the ceiling ---


def test_approval_gate_triggers_only_above_the_ceiling():
    assert requires_human_approval(_option(0.16), threshold=0.15)
    assert not requires_human_approval(_option(0.15), threshold=0.15)  # boundary: not over
    assert not requires_human_approval(_option(0.02), threshold=0.15)


def test_severe_scenario_reaches_the_gate_and_cheap_one_does_not():
    _, _, severe = _run("suez-blockage", "inv-severe")
    assert severe.get("needs_approval") is True and "__interrupt__" in severe

    _, _, moderate = _run("storm-north-sea", "inv-moderate")
    assert moderate.get("needs_approval") is False and "__interrupt__" not in moderate


# --- invariant 2: the optimizer picks the cheapest option under the ETA cap ---


def test_optimizer_picks_cheapest_under_eta_cap():
    _, _, result = _run("storm-north-sea", "inv-opt")
    # Both storm options fit the 72h cap, so the +2% hold beats the +9% rail.
    assert result["chosen_option"]["label"] == "hold-and-wait"
    assert result["chosen_option"]["cost_delta"] == 0.02


# --- invariant 3: agents may draft but never send; output is validated --------


def test_send_is_never_allowlisted():
    check_action("communicator.draft")  # allowed
    for forbidden in ("communicator.send", "optimizer.execute_booking"):
        try:
            check_action(forbidden)
            raise AssertionError(f"{forbidden} should be blocked")
        except GuardrailViolation:
            pass


def test_customer_message_must_be_valid():
    validate_customer_message("Route R-330 is delayed by 48h.", "R-330")  # ok
    for bad in ["no route id here", "R-330 " + "x" * 1300, "R-330 internal margin held"]:
        try:
            validate_customer_message(bad, "R-330")
            raise AssertionError("invalid message should be rejected")
        except GuardrailViolation:
            pass


# --- invariant 4: a rejected override still produces a (delay) notice ---------


def test_rejected_override_still_issues_a_delay_notice():
    graph, cfg, _ = _run("suez-blockage", "inv-reject")
    result = graph.invoke(Command(resume="rejected"), cfg)
    assert result["approval_decision"] == "rejected"
    msg = result["customer_message"]
    assert "R-330" in msg and "original routing" in msg
