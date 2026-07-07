"""Feed abstraction: where the agents get their external data from.

Two implementations of the same interface:

- LocalFeed calls the in-process scenario fixtures directly. Fast and
  deterministic; the default for tests and CI.
- MCPFeed talks to the MCP server (`supplyagents.mcp_server`) over stdio,
  which is how a real deployment would consume shared tool servers.

The graph does not care which one it gets. That is the point of MCP here:
the tool surface is the contract, the transport is swappable.
"""

import asyncio
import json
import sys
from typing import Any, Protocol

from supplyagents import providers
from supplyagents.state import Disruption, Route, RouteOption


class Feed(Protocol):
    def active_routes(self) -> list[Route]: ...

    def poll_disruptions(self, scenario: str) -> list[Disruption]: ...

    def route_options(self, scenario: str) -> list[RouteOption]: ...


class LocalFeed:
    """In-process feed over the scenario fixtures."""

    def active_routes(self) -> list[Route]:
        return providers.ACTIVE_ROUTES

    def poll_disruptions(self, scenario: str) -> list[Disruption]:
        return providers.poll_disruptions(scenario)

    def route_options(self, scenario: str) -> list[RouteOption]:
        return providers.route_options(scenario)


class MCPFeed:
    """Feed backed by the MCP server over stdio.

    Each call spawns the server process, initializes a session, calls one
    tool, and tears down. That is deliberately simple: an orchestrator run
    makes a handful of tool calls, and a fresh process per call avoids
    holding async state inside synchronous graph nodes. A long-lived
    session is the obvious optimization once call volume justifies it
    (recorded in DECISIONS.md).
    """

    def __init__(self, command: list[str] | None = None):
        self._command = command or [sys.executable, "-m", "supplyagents.mcp_server"]

    def active_routes(self) -> list[Route]:
        return self._call_tool("active_routes", {})

    def poll_disruptions(self, scenario: str) -> list[Disruption]:
        return self._call_tool("poll_disruptions", {"scenario": scenario})

    def route_options(self, scenario: str) -> list[RouteOption]:
        return self._call_tool("route_options", {"scenario": scenario})

    def _call_tool(self, tool: str, arguments: dict[str, Any]) -> Any:
        return asyncio.run(self._call_tool_async(tool, arguments))

    async def _call_tool_async(self, tool: str, arguments: dict[str, Any]) -> Any:
        from mcp import ClientSession, StdioServerParameters
        from mcp.client.stdio import stdio_client

        params = StdioServerParameters(command=self._command[0], args=self._command[1:])
        async with (
            stdio_client(params) as (read, write),
            ClientSession(read, write) as session,
        ):
            await session.initialize()
            result = await session.call_tool(tool, arguments)

        if result.isError:
            detail = _first_text(result.content) or "no detail"
            raise RuntimeError(f"MCP tool {tool!r} failed: {detail}")

        # FastMCP puts typed return values in structuredContent
        # ({"result": ...} for non-dict returns); fall back to text JSON.
        if result.structuredContent is not None:
            structured = result.structuredContent
            return structured.get("result", structured)
        text = _first_text(result.content)
        if text is None:
            raise RuntimeError(f"MCP tool {tool!r} returned no parseable content")
        return json.loads(text)


def _first_text(content: list[Any]) -> str | None:
    for block in content:
        if getattr(block, "type", None) == "text":
            return block.text
    return None
