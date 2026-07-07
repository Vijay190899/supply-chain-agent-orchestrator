"""Simulation CLI.

Fires a named disruption scenario at the orchestrator and prints what the
agents do. When a run hits the human-approval gate it pauses on a SQLite
checkpoint; pass --approve or --reject to resume it (the default approves,
so a plain run shows the full flow end to end).

Examples:
    python -m supplyagents.simulate --scenario clear
    python -m supplyagents.simulate --scenario storm-north-sea
    python -m supplyagents.simulate --scenario suez-blockage --reject
"""

import argparse
import uuid

from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.types import Command

from supplyagents import providers
from supplyagents.config import get_settings
from supplyagents.graph import build_graph


def main() -> None:
    parser = argparse.ArgumentParser(description="Run a simulated disruption scenario.")
    parser.add_argument(
        "--scenario",
        default="storm-north-sea",
        choices=providers.known_scenarios(),
        help="Which disruption scenario to fire.",
    )
    decision = parser.add_mutually_exclusive_group()
    decision.add_argument(
        "--approve",
        dest="decision",
        action="store_const",
        const="approved",
        help="Approve the cost override if the run pauses for approval (default).",
    )
    decision.add_argument(
        "--reject",
        dest="decision",
        action="store_const",
        const="rejected",
        help="Reject the cost override if the run pauses for approval.",
    )
    parser.set_defaults(decision="approved")
    parser.add_argument(
        "--thread",
        default=None,
        help="Thread id for the checkpoint store (default: a fresh uuid).",
    )
    args = parser.parse_args()

    settings = get_settings()
    thread_id = args.thread or f"sim-{uuid.uuid4().hex[:8]}"
    config = {"configurable": {"thread_id": thread_id}}

    print(f"scenario : {args.scenario}")
    print(f"thread   : {thread_id}")
    print(f"threshold: {settings.human_approval_threshold:.0%} cost override\n")

    with SqliteSaver.from_conn_string(settings.checkpoint_db) as saver:
        graph = build_graph(saver)
        result = graph.invoke({"scenario": args.scenario, "events": []}, config)

        interrupts = result.get("__interrupt__")
        if interrupts:
            payload = interrupts[0].value
            print("-- run paused for human approval --")
            print(f"   reason : {payload['reason']}")
            print(
                f"   option : {payload['option']} on {payload['route_id']} "
                f"(cost {payload['cost_delta']:+.0%}, ETA {payload['eta_delta_hours']:+d}h)"
            )
            print(f"   decision: {args.decision} (via CLI flag)\n")
            result = graph.invoke(Command(resume=args.decision), config)

    print("-- event log --")
    for event in result.get("events", []):
        print(f"   {event}")

    message = result.get("customer_message")
    if message:
        print("\n-- drafted customer message --")
        print(message)
    else:
        print("\nno customer message drafted (no disruption or no action taken)")


if __name__ == "__main__":
    main()
