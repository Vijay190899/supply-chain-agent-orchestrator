"""HTTP service and the shared runner.

Deterministic: conftest blanks the provider key, so the communicator uses its
template path and no network is touched.
"""

from fastapi.testclient import TestClient

from supplyagents.runner import run_scenario
from supplyagents.service import app

client = TestClient(app)


def test_root_lists_scenarios():
    body = client.get("/").json()
    assert "suez-blockage" in body["scenarios"]


def test_healthz():
    assert client.get("/healthz").json() == {"status": "ok"}


def test_run_severe_scenario_resolves_approval():
    body = client.post("/run", json={"scenario": "suez-blockage", "decision": "approved"}).json()
    assert body["needs_approval"] is True
    assert body["approval_decision"] == "approved"
    assert "R-330" in body["customer_message"]


def test_run_rejected_gives_delay_notice():
    body = client.post("/run", json={"scenario": "suez-blockage", "decision": "rejected"}).json()
    assert body["approval_decision"] == "rejected"
    assert "original routing" in body["customer_message"]


def test_run_clear_scenario_no_message():
    body = client.post("/run", json={"scenario": "clear"}).json()
    assert body["customer_message"] is None
    assert body["needs_approval"] is False


def test_unknown_scenario_returns_422():
    assert client.post("/run", json={"scenario": "volcano"}).status_code == 422


def test_runner_defaults_to_approved():
    result = run_scenario("suez-blockage")
    assert result["approval_decision"] == "approved"
    assert result["thread_id"].startswith("run-")
