# Stack

What this uses and why.

## Language and runtime
- **Python 3.12**.
- **uv** for packaging.

## Orchestration
- **LangGraph** for the production orchestrator. Stateful, cyclic graph with a supervisor node and human-in-the-loop interrupts. This is the framework I'd ship.
- **CrewAI** for a second implementation of the same workflow, built purely to benchmark against LangGraph (dev speed, control, state handling, cost). The comparison write-up is a deliverable, not an afterthought.
- **LangChain** for the shared LLM and tool plumbing under both.

## Tools and protocols
- **MCP (Model Context Protocol)**: weather, news, and logistics tools exposed as MCP servers rather than inline functions.
- **A2A**, noted as the direction for agent-to-agent messaging. Not wired in yet.

## State
- **SQLite** as the LangGraph checkpoint / thread store, so runs can pause for human approval and resume.

## Safety
- Action-scope guardrails (allowlist): agents draft but don't send, propose but don't exceed the 15% cost threshold without sign-off.
- Output validation on anything customer-facing.

## Observability
- **LangSmith / Langfuse** for per-agent tracing: decision path, latency, token cost.

## Ops and deployment
- **Docker** for local parity.
- **GCP**: Cloud Run, or GKE for the stateful supervisor; checkpoint store on Cloud SQL.
- **GitHub Actions**: lint and test.

## Interface
- A CLI that fires simulated disruption scenarios and prints the agents' responses and the supervisor's routing.
