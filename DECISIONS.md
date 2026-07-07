# Decisions

Running log, newest first. Non-obvious trade-offs get a full record under [docs/adr/](docs/adr/).

| Date | Decision | Notes |
|---|---|---|
| 2026-07-07 | Adopt lightweight ADRs | See [ADR-0001](docs/adr/0001-record-architecture-decisions.md). |
| 2026-07-07 | Build the orchestrator twice (LangGraph + CrewAI) | The comparison is the point; I want a numbers-backed reason to pick one. See [ADR-0002](docs/adr/0002-orchestration-framework.md). |
| 2026-07-07 | SQLite for checkpointing | Simplest durable store that supports pause/resume for human approval; swap for Postgres if it outgrows it. |

_Add a row when you make a call worth remembering._
