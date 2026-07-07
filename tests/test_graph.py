"""End-to-end graph behavior on the deterministic scenarios.

These run the real compiled graph (no LLM, no network): routing decisions,
the human-approval interrupt, resume in both directions, and checkpointing.
"""

import pytest
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command

from supplyagents.graph import build_graph


def _run(scenario: str, thread_id: str):
    graph = build_graph(MemorySaver())
    config = {"configurable": {"thread_id": thread_id}}
    result = graph.invoke({"scenario": scenario, "events": []}, config)
    return graph, config, result


def test_clear_scenario_ends_without_action():
    _, _, result = _run("clear", "t-clear")
    assert result["disruptions"] == []
    assert "customer_message" not in result
    assert any("no disruptions" in e for e in result["events"])


def test_moderate_scenario_completes_without_approval():
    _, _, result = _run("storm-north-sea", "t-storm")
    # Both options fit the 72h ETA cap, so the optimizer picks the cheaper one
    # (+2% hold-and-wait), which stays under the 15% approval threshold.
    assert result["chosen_option"]["label"] == "hold-and-wait"
    assert result["needs_approval"] is False
    assert "__interrupt__" not in result
    assert "R-201" in result["customer_message"]


def test_severe_scenario_pauses_for_approval():
    graph, config, result = _run("suez-blockage", "t-suez")
    # +22% exceeds the 15% threshold: the run must be paused, not finished.
    assert result["needs_approval"] is True
    assert "customer_message" not in result
    interrupts = result["__interrupt__"]
    assert interrupts[0].value["route_id"] == "R-330"
    # The graph is parked on the approval node.
    assert graph.get_state(config).next == ("human_approval",)


def test_approved_override_leads_to_reroute_notice():
    graph, config, _ = _run("suez-blockage", "t-suez-approve")
    result = graph.invoke(Command(resume="approved"), config)
    assert result["approval_decision"] == "approved"
    assert "R-330" in result["customer_message"]
    # The reroute notice references the replanning, not just a delay.
    assert "replanned" in result["customer_message"].lower()


def test_rejected_override_falls_back_to_delay_notice():
    graph, config, _ = _run("suez-blockage", "t-suez-reject")
    result = graph.invoke(Command(resume="rejected"), config)
    assert result["approval_decision"] == "rejected"
    message = result["customer_message"]
    assert "R-330" in message
    assert "original routing" in message


def test_invalid_resume_value_is_rejected():
    graph, config, _ = _run("suez-blockage", "t-suez-bad")
    with pytest.raises(ValueError, match="approved.*rejected"):
        graph.invoke(Command(resume="maybe"), config)


def test_unknown_scenario_fails_loudly():
    graph = build_graph(MemorySaver())
    config = {"configurable": {"thread_id": "t-unknown"}}
    with pytest.raises(ValueError, match="Unknown scenario"):
        graph.invoke({"scenario": "volcano", "events": []}, config)
