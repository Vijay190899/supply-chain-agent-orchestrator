"""Observability: node timings without any keys, exporter selection logic."""

from langgraph.checkpoint.memory import MemorySaver

from supplyagents.config import Settings
from supplyagents.graph import build_graph
from supplyagents.observability import RunTimer, enabled_exporters


def test_run_timer_records_graph_nodes():
    timer = RunTimer()
    graph = build_graph(MemorySaver())
    config = {"configurable": {"thread_id": "t-obs"}, "callbacks": [timer]}
    graph.invoke({"scenario": "storm-north-sea", "events": []}, config)

    names = [name for name, _ in timer.timings]
    assert names == ["monitor", "optimizer", "communicator"]
    assert all(seconds >= 0 for _, seconds in timer.timings)
    # The report is printable and mentions every node that ran.
    report = timer.report()
    for name in names:
        assert name in report


def test_run_timer_empty_report_is_graceful():
    assert "no node timings" in RunTimer().report()


def test_no_exporters_without_keys():
    settings = Settings(_env_file=None)
    assert enabled_exporters(settings) == []


def test_langfuse_requires_both_keys():
    settings = Settings(_env_file=None, langfuse_public_key="pk", langfuse_secret_key="")
    assert enabled_exporters(settings) == []
    settings = Settings(_env_file=None, langfuse_public_key="pk", langfuse_secret_key="sk")
    assert enabled_exporters(settings) == ["langfuse"]


def test_langsmith_requires_flag_and_key():
    settings = Settings(_env_file=None, langsmith_api_key="key", langsmith_tracing=False)
    assert enabled_exporters(settings) == []
    settings = Settings(_env_file=None, langsmith_api_key="key", langsmith_tracing=True)
    assert enabled_exporters(settings) == ["langsmith"]
