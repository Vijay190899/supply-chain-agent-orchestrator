"""The orchestrator graph.

Control flow:

    START -> monitor -> (no disruptions? END)
                     -> optimizer -> (needs approval? human_approval) -> communicator -> END
                                  -> (otherwise) ------------------------^

The human-approval gate is structural: when the optimizer's recommendation
exceeds the cost threshold, the graph interrupts inside `human_approval` and
cannot reach the communicator until someone resumes it with a decision. An
agent cannot talk its way past the gate because the gate is an edge, not a
prompt.
"""

from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import interrupt

from supplyagents.nodes import communicator, monitor, optimizer
from supplyagents.state import OrchestratorState


def human_approval(state: OrchestratorState) -> dict:
    """Pause the run and wait for a human decision on the cost override.

    `interrupt()` checkpoints the graph and raises; the caller sees the payload,
    collects a decision, and resumes with Command(resume="approved"|"rejected").
    """
    option = state["chosen_option"]
    assert option is not None  # routing guarantees this
    decision = interrupt(
        {
            "reason": "cost override exceeds approval threshold",
            "route_id": option["route_id"],
            "option": option["label"],
            "cost_delta": option["cost_delta"],
            "eta_delta_hours": option["eta_delta_hours"],
        }
    )
    if decision not in ("approved", "rejected"):
        raise ValueError(f"Approval decision must be 'approved' or 'rejected', got {decision!r}")
    return {
        "approval_decision": decision,
        "events": [f"human_approval: override {decision} for option {option['label']!r}"],
    }


def _route_after_monitor(state: OrchestratorState) -> str:
    return "optimizer" if state["disruptions"] else END


def _route_after_optimizer(state: OrchestratorState) -> str:
    if state.get("chosen_option") is None:
        return END
    return "human_approval" if state["needs_approval"] else "communicator"


def build_graph(checkpointer: BaseCheckpointSaver | None = None):
    """Compile the orchestrator. A checkpointer is required for pause/resume."""
    builder = StateGraph(OrchestratorState)
    builder.add_node("monitor", monitor)
    builder.add_node("optimizer", optimizer)
    builder.add_node("human_approval", human_approval)
    builder.add_node("communicator", communicator)

    builder.add_edge(START, "monitor")
    builder.add_conditional_edges("monitor", _route_after_monitor, ["optimizer", END])
    builder.add_conditional_edges(
        "optimizer", _route_after_optimizer, ["human_approval", "communicator", END]
    )
    builder.add_edge("human_approval", "communicator")
    builder.add_edge("communicator", END)

    return builder.compile(checkpointer=checkpointer)
