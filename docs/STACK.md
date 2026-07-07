# Stack

What this uses and why.

## Language & runtime
- **Python 3.12**
- **uv** for packaging.

## Orchestration
- **LangGraph** — the production orchestrator. Stateful, cyclic graph with a supervisor node and human-in-the-loop interrupts. This is the framework I'd ship.
- **CrewAI** — a second implementation of the same workflow, built purely to benchmark against LangGraph (dev speed, control, state handling, cost). The comparison write-up is a deliverable, not an afterthought.
- **LangChain** — shared LLM/tool plumbing under both.

## Tools & protocols
- **MCP (Model Context Protocol)** — weather / news / logistics tools exposed as MCP servers rather than inline functions.
- **A2A** — noted as the direction for agent-to-agent messaging; not wired in yet.

## State
- **SQLite** — the LangGraph checkpoint / thread store, so runs can pause for human approval and resume.

## Safety
- Action-scope guardrails (allowlist): agents draft but don't send, propose but don't exceed the 15% cost threshold without sign-off.
- Output validation on anything customer-facing.

## Observability
- **LangSmith / Langfuse** — per-agent tracing: decision path, latency, token cost.

## Ops & deployment
- **Docker** for local parity.
- **GCP** — Cloud Run, or GKE for the stateful supervisor; checkpoint store on Cloud SQL.
- **GitHub Actions** — lint + test.

## Interface
- A CLI that fires simulated disruption scenarios and prints the agents' responses and the supervisor's routing.
