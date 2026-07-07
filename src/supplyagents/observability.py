"""Observability: local run timings always, exporters when configured.

Two layers, deliberately separate:

- RunTimer is a plain LangChain callback that measures wall time per graph
  node. It has no external dependency and is always on, so every run (and
  CI) gets timing data for free.
- Exporters (Langfuse, LangSmith) switch on only when their keys are
  present in the environment. No keys, no export, and the CLI says so
  instead of pretending.
"""

import os
import time
from typing import Any
from uuid import UUID

from langchain_core.callbacks import BaseCallbackHandler

from supplyagents.config import Settings

# Graph nodes worth reporting on. Callback events also fire for the graph
# itself and channel writes; those stay out of the report.
GRAPH_NODES = ("monitor", "optimizer", "human_approval", "communicator")


class RunTimer(BaseCallbackHandler):
    """Collects wall-time per named graph node across one or more invocations."""

    def __init__(self) -> None:
        self._starts: dict[UUID, tuple[str, float]] = {}
        # list of (node_name, seconds), in completion order
        self.timings: list[tuple[str, float]] = []

    def on_chain_start(
        self,
        serialized: dict[str, Any] | None,
        inputs: Any,
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        name = kwargs.get("name") or (serialized or {}).get("name") or ""
        if name in GRAPH_NODES:
            self._starts[run_id] = (name, time.perf_counter())

    def on_chain_end(self, outputs: Any, *, run_id: UUID, **kwargs: Any) -> None:
        started = self._starts.pop(run_id, None)
        if started is not None:
            name, t0 = started
            self.timings.append((name, time.perf_counter() - t0))

    def report(self) -> str:
        if not self.timings:
            return "(no node timings recorded)"
        width = max(len(name) for name, _ in self.timings)
        lines = [f"{name:<{width}}  {seconds * 1000:7.1f} ms" for name, seconds in self.timings]
        return "\n".join(lines)


def enabled_exporters(settings: Settings) -> list[str]:
    """Which tracing backends are configured. Pure decision logic, unit-tested."""
    exporters = []
    if settings.langfuse_public_key and settings.langfuse_secret_key:
        exporters.append("langfuse")
    if settings.langsmith_tracing and settings.langsmith_api_key:
        exporters.append("langsmith")
    return exporters


def tracing_callbacks(settings: Settings) -> tuple[list[BaseCallbackHandler], list[str]]:
    """Build the callback list for a run: RunTimer always, exporters if configured.

    Returns (callbacks, exporter_names). LangSmith needs no callback of its
    own; LangChain picks it up from the environment, which we propagate here
    so values from .env reach libraries that only read os.environ.
    """
    exporters = enabled_exporters(settings)
    callbacks: list[BaseCallbackHandler] = [RunTimer()]

    if "langfuse" in exporters:
        os.environ.setdefault("LANGFUSE_PUBLIC_KEY", settings.langfuse_public_key)
        os.environ.setdefault("LANGFUSE_SECRET_KEY", settings.langfuse_secret_key)
        os.environ.setdefault("LANGFUSE_HOST", settings.langfuse_host)
        from langfuse.langchain import CallbackHandler

        callbacks.append(CallbackHandler())

    if "langsmith" in exporters:
        os.environ.setdefault("LANGSMITH_TRACING", "true")
        os.environ.setdefault("LANGSMITH_API_KEY", settings.langsmith_api_key)

    return callbacks, exporters
