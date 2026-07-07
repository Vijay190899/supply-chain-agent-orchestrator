"""MCP server exposing the supply-chain data feeds as tools.

Any MCP-aware client (this project's MCPFeed, an IDE, another agent) can
consume these over stdio:

    python -m supplyagents.mcp_server

The tools wrap the same deterministic scenario fixtures the rest of the
project uses, so an MCP-backed run and a local run see identical data.
"""

from mcp.server.fastmcp import FastMCP

from supplyagents import providers

mcp = FastMCP(
    "supply-chain-feeds",
    instructions=(
        "Read-only feeds for a logistics orchestrator: active shipping routes, "
        "disruption reports per scenario, and priced replanning options."
    ),
    # Keep request-level INFO logs off stderr so CLI output stays readable.
    log_level="WARNING",
)


@mcp.tool()
def active_routes() -> list[dict]:
    """List the active shipping routes under management."""
    return [dict(route) for route in providers.ACTIVE_ROUTES]


@mcp.tool()
def poll_disruptions(scenario: str) -> list[dict]:
    """Report current disruptions for a named scenario.

    Known scenarios: clear, storm-north-sea, suez-blockage.
    """
    return [dict(d) for d in providers.poll_disruptions(scenario)]


@mcp.tool()
def route_options(scenario: str) -> list[dict]:
    """Priced replanning options for a scenario. Cost deltas are fractions of base cost."""
    return [dict(o) for o in providers.route_options(scenario)]


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
