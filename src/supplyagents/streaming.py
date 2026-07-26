"""Streaming run support for the HTTP service.

Drives the graph with `graph.stream(..., stream_mode="updates")` and yields one
NDJSON line per event so a browser can animate the agents as they execute. The
human-approval gate pauses the stream; a follow-up resume call continues it.

A module-level checkpointer keeps the paused run alive between the start and
resume requests. That means resume must hit the same process, fine for local
dev and a single warm Cloud Run instance; a multi-instance deployment would
move this to a shared store (Cloud SQL). Documented in DEPLOY.md.
"""

import json
import time
from collections.abc import Iterator
from typing import Any

from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command

from supplyagents.graph import build_graph

# One saver for the process; threads are keyed by thread_id.
_saver = MemorySaver()


def _line(event: dict[str, Any]) -> str:
    return json.dumps(event, default=str) + "\n"


def _safe_delta(delta: Any) -> dict[str, Any]:
    """A node's state update minus the append-only event log (sent separately)."""
    if not isinstance(delta, dict):
        return {}
    return {k: v for k, v in delta.items() if k != "events"}


def stream_run(scenario: str, thread_id: str, resume: str | None = None) -> Iterator[str]:
    """Yield NDJSON lines for a run (or its resumption).

    Event shapes:
      {"type": "run_started"|"resumed", "scenario", "thread_id"}
      {"type": "node", "node", "elapsed_ms", "events": [...], "data": {...}}
      {"type": "await_approval", "thread_id", "payload": {...}}
      {"type": "done", "result": {...}}
      {"type": "error", "message"}
    """
    graph = build_graph(_saver)
    config = {"configurable": {"thread_id": thread_id}}
    graph_input: Any = (
        Command(resume=resume) if resume is not None else {"scenario": scenario, "events": []}
    )

    yield _line(
        {
            "type": "resumed" if resume is not None else "run_started",
            "scenario": scenario,
            "thread_id": thread_id,
        }
    )

    last = time.perf_counter()
    interrupted = False
    try:
        for chunk in graph.stream(graph_input, config, stream_mode="updates"):
            if "__interrupt__" in chunk:
                payload = chunk["__interrupt__"][0].value
                yield _line({"type": "await_approval", "thread_id": thread_id, "payload": payload})
                interrupted = True
                break
            now = time.perf_counter()
            for node, delta in chunk.items():
                events = delta.get("events", []) if isinstance(delta, dict) else []
                yield _line(
                    {
                        "type": "node",
                        "node": node,
                        "elapsed_ms": round((now - last) * 1000, 1),
                        "events": events,
                        "data": _safe_delta(delta),
                    }
                )
            last = now
    except Exception as exc:  # surface failures to the UI instead of hanging
        yield _line({"type": "error", "message": str(exc)})
        return

    if not interrupted:
        state = graph.get_state(config).values
        yield _line(
            {
                "type": "done",
                "result": {
                    "events": state.get("events", []),
                    "chosen_option": state.get("chosen_option"),
                    "customer_message": state.get("customer_message"),
                    "approval_decision": state.get("approval_decision"),
                },
            }
        )
