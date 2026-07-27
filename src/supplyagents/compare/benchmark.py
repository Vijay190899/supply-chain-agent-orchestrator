"""Runtime benchmark: LangGraph orchestrator vs CrewAI crew, same workflow.

Runs both implementations N times on the same scenario, holding the model
constant, and emits an auditable result: a dated JSON with full provenance
(git SHA, model, provider, package versions, every per-run datapoint) written
to `compare/results/`, and it regenerates the table in docs/COMPARISON.md
between the BENCH markers. No hand-pasting; the number in the doc always
traces to a committed artifact.

Requires OPENAI_API_KEY (any OpenAI-compatible provider; .env.example lists
free options). Without it, exits with instructions rather than fake numbers.

    make bench                       # 5 runs on suez-blockage, writes JSON + table
    uv run python -m supplyagents.compare.benchmark --scenario suez-blockage --runs 8
"""

import argparse
import json
import platform
import statistics
import subprocess
import time
from datetime import UTC, datetime
from importlib.metadata import version
from pathlib import Path
from typing import Any
from uuid import UUID

from langchain_core.callbacks import BaseCallbackHandler
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command

from supplyagents.config import get_settings
from supplyagents.graph import build_graph
from supplyagents.observability import tracing_callbacks

REPO = Path(__file__).resolve().parents[3]
RESULTS = REPO / "compare" / "results"
COMPARISON = REPO / "docs" / "COMPARISON.md"
START, END = "<!-- BENCH:START -->", "<!-- BENCH:END -->"


class LLMUsageCounter(BaseCallbackHandler):
    """Counts LLM requests and tokens on the LangGraph side."""

    def __init__(self) -> None:
        self.requests = 0
        self.total_tokens = 0

    def on_llm_end(self, response: Any, *, run_id: UUID, **kwargs: Any) -> None:
        self.requests += 1
        usage = (response.llm_output or {}).get("token_usage", {})
        self.total_tokens += int(usage.get("total_tokens", 0) or 0)


def run_langgraph_once(scenario: str, sha: str) -> dict:
    counter = LLMUsageCounter()
    callbacks, _ = tracing_callbacks(get_settings())
    graph = build_graph(MemorySaver())
    config = {
        "configurable": {"thread_id": f"bench-{time.monotonic_ns()}"},
        "callbacks": [counter, *callbacks],
        # tag the run so it is findable in Langfuse (session=bench)
        "metadata": {
            "langfuse_session_id": "bench",
            "langfuse_tags": ["bench", "langgraph", scenario, sha],
        },
    }
    t0 = time.perf_counter()
    result = graph.invoke({"scenario": scenario, "events": []}, config)
    if "__interrupt__" in result:
        result = graph.invoke(Command(resume="approved"), config)
    return {
        "seconds": round(time.perf_counter() - t0, 3),
        "requests": counter.requests,
        "tokens": counter.total_tokens,
    }


def run_crewai_once(scenario: str) -> dict:
    from supplyagents.compare.crew import run_workflow

    t0 = time.perf_counter()
    result = run_workflow(scenario, decision="approved")
    return {
        "seconds": round(time.perf_counter() - t0, 3),
        "requests": result.usage.get("successful_requests", 0),
        "tokens": result.usage.get("total_tokens", 0),
    }


def _stats(values: list[float]) -> dict:
    s = sorted(values)
    p95 = s[min(len(s) - 1, round(0.95 * (len(s) - 1)))]
    return {
        "median": round(statistics.median(values), 2),
        "mean": round(statistics.mean(values), 2),
        "p95": round(p95, 2),
        "min": round(min(values), 2),
        "max": round(max(values), 2),
    }


def _git_sha() -> str:
    try:
        out = subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], cwd=REPO)
        return out.decode().strip()
    except Exception:
        return "unknown"


def _provenance(scenario: str, runs: int) -> dict:
    s = get_settings()
    return {
        "timestamp_utc": datetime.now(UTC).isoformat(timespec="seconds"),
        "git_sha": _git_sha(),
        "scenario": scenario,
        "runs": runs,
        "model": s.llm_model,
        "provider": s.openai_base_url or "openai",
        "python": platform.python_version(),
        "host": platform.platform(),
        "packages": {p: version(p) for p in ("langgraph", "crewai", "langchain") if _safe_ver(p)},
    }


def _safe_ver(pkg: str) -> str | None:
    try:
        return version(pkg)
    except Exception:
        return None


def _summarize(runs: list[dict]) -> dict:
    return {
        "requests": _stats([r["requests"] for r in runs]),
        "tokens": _stats([r["tokens"] for r in runs]),
        "seconds": _stats([r["seconds"] for r in runs]),
        "per_run": runs,
    }


def _render_table(data: dict) -> str:
    m, lg, cw = data["meta"], data["langgraph"], data["crewai"]
    lines = [
        START,
        "",
        f"_Measured {m['timestamp_utc']}, n={m['runs']} per side, model `{m['model']}` "
        f"via `{m['provider']}`, git `{m['git_sha']}`. Leading with the deterministic "
        f"metrics (requests, tokens); wall time carries network variance. "
        f"Regenerated by `make bench` from [compare/results/]"
        f"(../compare/results/)._",
        "",
        "| Framework | requests (median) | tokens (median) | wall time (median, p95) |",
        "|---|---|---|---|",
        f"| LangGraph | {lg['requests']['median']:.0f} | {lg['tokens']['median']:.0f} | "
        f"{lg['seconds']['median']:.2f}s, p95 {lg['seconds']['p95']:.2f}s |",
        f"| CrewAI | {cw['requests']['median']:.0f} | {cw['tokens']['median']:.0f} | "
        f"{cw['seconds']['median']:.2f}s, p95 {cw['seconds']['p95']:.2f}s |",
        "",
        END,
    ]
    return "\n".join(lines)


def _regenerate_comparison(data: dict) -> bool:
    if not COMPARISON.exists():
        return False
    text = COMPARISON.read_text(encoding="utf-8")
    if START not in text or END not in text:
        return False
    pre, rest = text.split(START, 1)
    _, post = rest.split(END, 1)
    COMPARISON.write_text(pre + _render_table(data) + post, encoding="utf-8")
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--scenario", default="suez-blockage")
    parser.add_argument("--runs", type=int, default=5)
    args = parser.parse_args()

    if not get_settings().openai_api_key:
        raise SystemExit(
            "OPENAI_API_KEY is not set. The benchmark needs a real model on both "
            "sides to produce honest numbers. Any OpenAI-compatible provider works; "
            ".env.example lists free-tier options (Groq, Google AI Studio)."
        )

    meta = _provenance(args.scenario, args.runs)
    print(f"scenario: {args.scenario}, runs per side: {args.runs}, model: {meta['model']}\n")

    lg_runs = [run_langgraph_once(args.scenario, meta["git_sha"]) for _ in range(args.runs)]
    for i, r in enumerate(lg_runs, 1):
        print(f"langgraph run {i}: {r}")
    crew_runs = [run_crewai_once(args.scenario) for _ in range(args.runs)]
    for i, r in enumerate(crew_runs, 1):
        print(f"crewai    run {i}: {r}")

    data = {"meta": meta, "langgraph": _summarize(lg_runs), "crewai": _summarize(crew_runs)}

    RESULTS.mkdir(parents=True, exist_ok=True)
    out = RESULTS / f"{datetime.now(UTC):%Y-%m-%d}_{args.scenario}.json"
    out.write_text(json.dumps(data, indent=2), encoding="utf-8")
    regenerated = _regenerate_comparison(data)

    print(f"\nwrote {out.relative_to(REPO)}")
    print(
        "regenerated docs/COMPARISON.md table" if regenerated else "COMPARISON.md markers not found"
    )


if __name__ == "__main__":
    main()
