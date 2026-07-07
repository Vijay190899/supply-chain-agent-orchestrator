"""MCP integration: the stdio server must be a drop-in for the local feed.

These spawn the real MCP server as a subprocess (no mocks), so they prove
the actual transport, schema round-trip, and error propagation.
"""

import pytest
from langgraph.checkpoint.memory import MemorySaver

from supplyagents.feeds import LocalFeed, MCPFeed
from supplyagents.graph import build_graph


@pytest.fixture(scope="module")
def mcp_feed() -> MCPFeed:
    return MCPFeed()


def test_mcp_feed_matches_local_feed(mcp_feed):
    local = LocalFeed()
    assert mcp_feed.active_routes() == local.active_routes()
    for scenario in ("clear", "storm-north-sea", "suez-blockage"):
        assert mcp_feed.poll_disruptions(scenario) == local.poll_disruptions(scenario)
        assert mcp_feed.route_options(scenario) == local.route_options(scenario)


def test_mcp_feed_propagates_server_errors(mcp_feed):
    with pytest.raises(RuntimeError, match="poll_disruptions"):
        mcp_feed.poll_disruptions("volcano")


def test_graph_runs_end_to_end_over_mcp(mcp_feed):
    graph = build_graph(MemorySaver(), feed=mcp_feed)
    config = {"configurable": {"thread_id": "t-mcp"}}
    result = graph.invoke({"scenario": "storm-north-sea", "events": []}, config)
    # Same outcome as the in-process run: cheap option, no approval needed,
    # message drafted and validated.
    assert result["chosen_option"]["label"] == "hold-and-wait"
    assert "R-201" in result["customer_message"]
