# ADR-0002: Orchestration framework (LangGraph, with a CrewAI comparison)

- **Status:** Accepted
- **Date:** 2026-07-07

## Context

The core of this project is a multi-agent workflow with a supervisor, cyclic control flow, and a human-approval interrupt when a cost override exceeds 15%. Several frameworks can express this: LangGraph, CrewAI, AutoGen, the OpenAI Agents SDK. I need to pick one to ship, and I also want a defensible, hands-on opinion about the alternatives rather than one repeated from a blog.

## Decision

Ship on **LangGraph**. The hard requirement here is durable, cyclic, stateful control flow with a clean pause/resume for human approval, and that is precisely what LangGraph is built around (explicit graph, checkpointing, interrupts).

Separately, re-implement the same four-role workflow in **CrewAI** and publish a written comparison: development effort, control granularity, how each handles the human-in-the-loop interrupt, and token cost. CrewAI is the natural foil because it's higher-level, so the comparison measures exactly that trade-off.

## Consequences

- Two implementations to maintain, but only LangGraph is the shipping path; CrewAI is scoped to the comparison scenario.
- The write-up becomes a portfolio artifact in its own right, a numbers-backed answer to "why LangGraph and not X".
- AutoGen and the OpenAI Agents SDK are covered elsewhere in the portfolio, so they're out of scope here.
