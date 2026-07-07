"""Runtime benchmark: LangGraph orchestrator vs CrewAI crew, same workflow.

Runs both implementations on the same scenario several times and prints a
markdown table (wall time, LLM requests, tokens) to paste into
docs/COMPARISON.md. Requires OPENAI_API_KEY so both sides actually use a
model; without it this exits with instructions instead of fake numbers.

    uv sync --extra compare
    uv run python -m supplyagents.compare.benchmark --scenario suez-blockage --runs 3
"""

import argparse
import statistics
import time
from typing import Any
from uuid import UUID

from langchain_core.callbacks import BaseCallbackHandler
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command

from supplyagents.config import get_settings
from supplyagents.graph import build_graph


class LLMUsageCounter(BaseCallbackHandler):
    """Counts LLM requests and tokens on the LangGraph side."""

    def __init__(self) -> None:
        self.requests = 0
        self.total_tokens = 0

    def on_llm_end(self, response: Any, *, run_id: UUID, **kwargs: Any) -> None:
        self.requests += 1
        usage = (response.llm_output or {}).get("token_usage", {})
        self.total_tokens += int(usage.get("total_tokens", 0) or 0)


def run_langgraph_once(scenario: str) -> dict:
    counter = LLMUsageCounter()
    graph = build_graph(MemorySaver())
    config = {
        "configurable": {"thread_id": f"bench-{time.monotonic_ns()}"},
        "callbacks": [counter],
    }
    t0 = time.perf_counter()
    result = graph.invoke({"scenario": scenario, "events": []}, config)
    if "__interrupt__" in result:
        result = graph.invoke(Command(resume="approved"), config)
    seconds = time.perf_counter() - t0
    return {
        "seconds": seconds,
        "requests": counter.requests,
        "tokens": counter.total_tokens,
        "message_chars": len(result.get("customer_message", "")),
    }


def run_crewai_once(scenario: str) -> dict:
    from supplyagents.compare.crew import run_workflow

    t0 = time.perf_counter()
    result = run_workflow(scenario, decision="approved")
    seconds = time.perf_counter() - t0
    return {
        "seconds": seconds,
        "requests": result.usage.get("successful_requests", 0),
        "tokens": result.usage.get("total_tokens", 0),
        "message_chars": len(result.customer_message or ""),
    }


def summarize(name: str, runs: list[dict]) -> str:
    seconds = [r["seconds"] for r in runs]
    return (
        f"| {name} | {statistics.mean(seconds):.2f} s "
        f"(min {min(seconds):.2f}, max {max(seconds):.2f}) "
        f"| {statistics.mean([r['requests'] for r in runs]):.1f} "
        f"| {statistics.mean([r['tokens'] for r in runs]):.0f} |"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--scenario", default="suez-blockage")
    parser.add_argument("--runs", type=int, default=3)
    args = parser.parse_args()

    if not get_settings().openai_api_key:
        raise SystemExit(
            "OPENAI_API_KEY is not set. The benchmark needs a real model on both "
            "sides to produce honest numbers. Add the key to .env and rerun."
        )

    print(f"scenario: {args.scenario}, runs per side: {args.runs}\n")

    lg_runs = []
    for i in range(args.runs):
        lg_runs.append(run_langgraph_once(args.scenario))
        print(f"langgraph run {i + 1}: {lg_runs[-1]}")

    crew_runs = []
    for i in range(args.runs):
        crew_runs.append(run_crewai_once(args.scenario))
        print(f"crewai    run {i + 1}: {crew_runs[-1]}")

    print("\nPaste into docs/COMPARISON.md:\n")
    print("| Implementation | Wall time | LLM requests | Total tokens |")
    print("|---|---|---|---|")
    print(summarize("LangGraph", lg_runs))
    print(summarize("CrewAI", crew_runs))


if __name__ == "__main__":
    main()
