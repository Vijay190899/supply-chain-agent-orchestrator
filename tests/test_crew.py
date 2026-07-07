"""CrewAI comparison implementation.

The whole module skips when crewai isn't installed (it lives behind the
`compare` extra, and CI doesn't install it). Construction tests run without
an API key; the execution smoke test needs one and skips otherwise.
"""

import os

import pytest

pytest.importorskip("crewai")

from supplyagents.compare.crew import (  # noqa: E402
    Recommendation,
    build_assessment_crew,
    build_communication_crew,
    run_workflow,
)


def test_assessment_crew_wiring():
    crew = build_assessment_crew()
    assert [a.role for a in crew.agents] == ["Logistics Monitor", "Route Optimizer"]
    assert len(crew.tasks) == 2
    # Phase 1 must end in structured output the gate can act on.
    assert crew.tasks[-1].output_pydantic is Recommendation
    monitor_tools = {t.name for t in crew.agents[0].tools}
    assert monitor_tools == {"get_active_routes", "poll_disruptions"}


def test_communication_crew_wiring():
    crew = build_communication_crew()
    assert [a.role for a in crew.agents] == ["Customer Communicator"]
    assert len(crew.tasks) == 1
    # The communicator gets no tools: it only writes, mirroring the
    # draft-only guardrail on the LangGraph side.
    assert crew.agents[0].tools == []


def test_recommendation_schema_matches_option_shape():
    fields = set(Recommendation.model_fields)
    assert {"route_id", "label", "cost_delta", "eta_delta_hours"} <= fields


@pytest.mark.skipif(not os.getenv("OPENAI_API_KEY"), reason="needs OPENAI_API_KEY")
def test_workflow_executes_end_to_end(monkeypatch, real_openai_key):
    # conftest blanks the key for determinism; this live test explicitly
    # opts back in with the real one.
    monkeypatch.setenv("OPENAI_API_KEY", real_openai_key)
    result = run_workflow("suez-blockage", decision="approved")
    assert result.needs_approval is True
    assert result.approval_decision == "approved"
    assert result.customer_message and "R-330" in result.customer_message
    assert result.usage.get("total_tokens", 0) > 0
