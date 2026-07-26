"""Run a scenario end to end and return a plain-dict result.

Shared by the CLI and the HTTP service so both drive the graph the same way.
When a run hits the approval gate, `decision` is applied and the run resumes,
which keeps the whole thing to a single call (no cross-request state needed).
"""

import uuid
from typing import Literal

from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command

from supplyagents.config import get_settings
from supplyagents.feeds import Feed
from supplyagents.graph import build_graph
from supplyagents.observability import tracing_callbacks

Decision = Literal["approved", "rejected"]


def run_scenario(
    scenario: str,
    decision: Decision = "approved",
    *,
    feed: Feed | None = None,
    checkpointer: BaseCheckpointSaver | None = None,
    thread_id: str | None = None,
) -> dict:
    """Execute one scenario, auto-resolving the approval gate with `decision`.

    Returns: scenario, thread_id, events, whether approval was needed and the
    decision applied, the chosen option, and the drafted customer message.
    """
    graph = build_graph(checkpointer or MemorySaver(), feed=feed)
    thread_id = thread_id or f"run-{uuid.uuid4().hex[:8]}"
    # Attach tracing when exporters are configured (e.g. Langfuse keys set as
    # Cloud Run secrets); a no-op otherwise.
    callbacks, _ = tracing_callbacks(get_settings())
    config = {"configurable": {"thread_id": thread_id}, "callbacks": callbacks}

    result = graph.invoke({"scenario": scenario, "events": []}, config)

    paused = "__interrupt__" in result
    if paused:
        result = graph.invoke(Command(resume=decision), config)

    return {
        "scenario": scenario,
        "thread_id": thread_id,
        "events": result.get("events", []),
        "needs_approval": paused,
        "approval_decision": decision if paused else None,
        "chosen_option": result.get("chosen_option"),
        "customer_message": result.get("customer_message"),
    }
