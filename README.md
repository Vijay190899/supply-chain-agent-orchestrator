# Supply-chain agent orchestrator

Logistics is one of those domains where a disruption you learn about an hour late has already cost real money. A customs hold, a storm across a corridor, a strike — someone has to notice, work out what it does to the affected routes, decide whether to re-route or eat the delay, and then tell the customer before they find out on their own. Today a lot of that is a human refreshing dashboards.

I wanted to see whether a small network of agents could carry the first pass of that loop: watch the signals, cost out the options, draft the customer message, and pull a human in only when the decision is expensive enough to deserve one.

This is also where I'm settling an argument I keep having with myself about agent frameworks — see below.

## The setup

Four roles working off shared state:

- **Monitor** — polls weather, news, and logistics APIs for the active routes.
- **Optimizer** — recalculates paths and freight cost when something changes.
- **Communicator** — drafts the customer notification, adjusting tone to the segment.
- **Supervisor** — routes control based on state, and stops for human sign-off when a cost override goes past 15%.

State is persisted so a run can pause for that human approval and resume later without losing its place.

## LangGraph vs CrewAI — the actual reason this project exists

I build the orchestrator **twice**:

1. **LangGraph** as the production path — because the real requirement here is durable, cyclic, stateful control flow with a human-in-the-loop pause. That's LangGraph's home turf.
2. **CrewAI** as a comparison — the same four-role workflow, expressed as a crew.

Then I write up the trade-off honestly: how much boilerplate each took, how much control I actually got over the state machine, how they handled the human-approval interrupt, and what the token cost looked like. The point isn't to crown a winner — it's to be able to say *why* I'd reach for one over the other, with numbers behind it.

## Why these choices

- **LangGraph** for the shipping path: explicit graph, real cycles, checkpointed state, first-class interrupts.
- **CrewAI** for the comparison: it's higher-level and faster to stand up, which is exactly the trade-off I want to measure.
- **MCP** for the tools — the weather/news/logistics calls are MCP servers, not hard-coded functions, so they're reusable and swappable. (A2A is where inter-agent messaging is heading; noted for later.)
- **Guardrails** on actions — least privilege: an agent may draft a message but not send it, may propose a re-route but not blow past the cost threshold without a human.
- **Observability** — every run is traced (LangSmith / Langfuse) so I can see the decision path, latency, and token spend per agent.

## Stack

See [docs/STACK.md](docs/STACK.md); architecture and design in [docs/TECHNICAL_DOCUMENTATION.md](docs/TECHNICAL_DOCUMENTATION.md). In short: Python, LangGraph, CrewAI, MCP, SQLite for the checkpoint store, LangSmith/Langfuse, Docker, deployed on GCP.

## Status

In progress, built in the open.

- [ ] LangGraph orchestrator + supervisor routing
- [ ] SQLite checkpointing + human-in-the-loop resume
- [ ] MCP tool servers (weather / news / logistics)
- [ ] Action guardrails
- [ ] CrewAI re-implementation
- [ ] Written LangGraph-vs-CrewAI benchmark
- [ ] Simulation CLI + GCP deploy

Decisions are logged in [DECISIONS.md](DECISIONS.md).

## Running it locally

```bash
make install
cp .env.example .env   # fill in keys
make test
make run               # runs a simulated disruption scenario
```

## Licence

MIT — see [LICENSE](LICENSE).
