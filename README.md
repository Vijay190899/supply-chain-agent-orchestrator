# Supply-chain agent orchestrator

In logistics, a disruption you hear about an hour late has usually already cost money. A customs hold, a storm across a shipping corridor, a strike. Someone has to notice it, work out what it does to the affected routes, decide whether to reroute or accept the delay, and tell the customer before they find out on their own. A lot of that is still a person refreshing dashboards.

I wanted to find out whether a small group of agents could handle the first pass of that loop: watch the signals, cost out the options, draft the customer message, and pull a human in only when the decision is expensive enough to need one.

It's also the project where I settle a question I keep going back and forth on about agent frameworks. More on that below.

## The setup

Four roles working off shared state:

- Monitor: polls weather, news, and logistics APIs for the active routes.
- Optimizer: recalculates paths and freight cost when something changes.
- Communicator: drafts the customer notification and adjusts tone to the segment.
- Supervisor: routes control based on state, and stops for human sign-off when a cost override goes past 15%.

State is saved, so a run can pause for that approval and pick up later without losing its place.

## LangGraph vs CrewAI, the reason this project exists

I build the orchestrator twice:

1. LangGraph as the production path, because the real requirement is durable, cyclic, stateful control flow with a human in the loop. That's what LangGraph is good at.
2. CrewAI as a comparison: the same four-role workflow, written as a crew.

Then I write up the tradeoff honestly: how much boilerplate each one took, how much control I got over the state machine, how they each handled the human-approval step, and what the token cost looked like. The point isn't to crown a winner. It's to be able to say why I'd reach for one over the other, with numbers behind it.

## Why these choices

- LangGraph for the shipping path: explicit graph, real cycles, checkpointed state, first-class interrupts.
- CrewAI for the comparison: it's higher-level and faster to stand up, which is exactly the tradeoff I want to measure.
- MCP for the tools. The weather, news, and logistics calls are MCP servers, not hard-coded functions, so they're reusable and swappable. (A2A is where agent-to-agent messaging is heading. Noted for later.)
- Guardrails on actions, with least privilege. An agent can draft a message but not send it, and can propose a reroute but not go past the cost threshold without a human.
- Observability: every run is traced (LangSmith or Langfuse) so I can see the decision path, latency, and token spend per agent.

## Stack

See [docs/STACK.md](docs/STACK.md); architecture and design in [docs/TECHNICAL_DOCUMENTATION.md](docs/TECHNICAL_DOCUMENTATION.md). In short: Python, LangGraph, CrewAI, MCP, SQLite for the checkpoint store, LangSmith/Langfuse, Docker, deployed on GCP.

## Status

In progress, built in the open.

- [x] LangGraph orchestrator and supervisor routing
- [x] SQLite checkpointing and human-in-the-loop resume
- [x] Action guardrails
- [x] Simulation CLI (pause/resume approval flow)
- [x] MCP tool server for the data feeds (run any scenario with `--mcp`)
- [ ] CrewAI re-implementation
- [ ] Written LangGraph vs CrewAI benchmark
- [x] Observability: per-node timings always on, Langfuse/LangSmith export when keys are set
- [ ] GCP deploy

Decisions are logged in [DECISIONS.md](DECISIONS.md).

## Running it locally

```bash
make install
cp .env.example .env  # fill in keys
make test
make run              # runs a simulated disruption scenario
```

## Licence

MIT. See [LICENSE](LICENSE).
