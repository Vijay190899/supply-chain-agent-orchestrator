# Decisions

Running log, newest first. Non-obvious trade-offs get a full record under [docs/adr/](docs/adr/).

| Date | Decision | Notes |
|---|---|---|
| 2026-07-07 | Feeds behind a protocol, MCP as one transport | `Feed` protocol with LocalFeed (in-process, tests) and MCPFeed (stdio). The graph doesn't know which it got; the tool surface is the contract. |
| 2026-07-07 | MCPFeed opens a session per tool call | Simple, avoids async state inside sync graph nodes, fine for a handful of calls per run. Long-lived session is the optimization path if call volume grows. |
| 2026-07-07 | Approval gate is structural, not prompted | The >15% override pauses via a graph interrupt; the communicator is unreachable without a resume decision. An agent can't talk its way past an edge. |
| 2026-07-07 | Dual-mode communicator | Deterministic template by default (tests/CI run without keys); LLM redraft when OPENAI_API_KEY is set. Both modes hit the same guardrails. |
| 2026-07-07 | Supervisor as routing functions, not an LLM agent | The routing decisions here are rule-shaped (disruptions? threshold?). Using an LLM to pick edges would add cost and nondeterminism for nothing. |
| 2026-07-07 | CrewAI behind a `compare` extra | Base install stays lean until the comparison phase; `uv sync --extra compare` pulls it in. |
| 2026-07-07 | Adopt lightweight ADRs | See [ADR-0001](docs/adr/0001-record-architecture-decisions.md). |
| 2026-07-07 | Build the orchestrator twice (LangGraph + CrewAI) | The comparison is the point; I want a numbers-backed reason to pick one. See [ADR-0002](docs/adr/0002-orchestration-framework.md). |
| 2026-07-07 | SQLite for checkpointing | Simplest durable store that supports pause/resume for human approval; swap for Postgres if it outgrows it. |

_Add a row when you make a call worth remembering._
