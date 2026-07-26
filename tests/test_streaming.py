"""Streaming endpoints that drive the web UI.

Deterministic (conftest blanks the key), so the communicator uses templates.
The module-level checkpointer in streaming.py lets a resume find the paused run.
"""

import json

from fastapi.testclient import TestClient

from supplyagents.service import app

client = TestClient(app)


def _lines(resp) -> list[dict]:
    return [json.loads(line) for line in resp.text.splitlines() if line.strip()]


def test_stream_pauses_at_approval_gate():
    events = _lines(client.post("/api/runs", json={"scenario": "suez-blockage"}))
    types = [e["type"] for e in events]
    assert types[0] == "run_started"
    assert "node" in types
    assert types[-1] == "await_approval"
    # The optimizer must have flagged the override before the pause.
    optimizer = next(e for e in events if e.get("node") == "optimizer")
    assert optimizer["data"]["needs_approval"] is True


def test_stream_completes_without_gate():
    events = _lines(client.post("/api/runs", json={"scenario": "storm-north-sea"}))
    assert events[-1]["type"] == "done"
    assert "await_approval" not in [e["type"] for e in events]
    assert "R-201" in events[-1]["result"]["customer_message"]


def test_resume_after_pause_finishes_run():
    started = _lines(client.post("/api/runs", json={"scenario": "suez-blockage"}))
    thread_id = started[-1]["thread_id"]
    resumed = _lines(
        client.post(
            "/api/runs/resume",
            json={"thread_id": thread_id, "scenario": "suez-blockage", "decision": "rejected"},
        )
    )
    assert resumed[-1]["type"] == "done"
    assert resumed[-1]["result"]["approval_decision"] == "rejected"
    assert "original routing" in resumed[-1]["result"]["customer_message"]


def test_stream_rejects_unknown_scenario():
    assert client.post("/api/runs", json={"scenario": "volcano"}).status_code == 422
