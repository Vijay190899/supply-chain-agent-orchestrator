# LangGraph vs CrewAI: the same workflow, built twice

This is the write-up promised in [ADR-0002](adr/0002-orchestration-framework.md). The same disruption-response workflow (monitor feeds, price options, gate expensive overrides on a human, draft the customer message) is implemented twice in this repo:

- **LangGraph**: `nodes.py` + `graph.py`, the production path.
- **CrewAI**: `compare/crew.py`, behind the `compare` extra.

Both use the same data feeds, the same guardrails module, and the same 15% approval threshold, so the differences below are framework differences, not workflow differences.

## Structural findings (measured on this repo)

| Dimension | LangGraph | CrewAI |
|---|---|---|
| Code for the workflow | 243 lines (`nodes.py` 161 + `graph.py` 82) | 232 lines (`crew.py`) |
| Shared between both | 214 lines (`state.py`, `feeds.py`, `guardrails.py`) | same |
| LLM calls per run | 0 or 1 (only the communicator, and only when a key is set) | Every agent reasons through the model; nothing runs without a key |
| Human approval gate | Inside the graph: a checkpointed `interrupt()`; the run parks in SQLite and resumes with a decision, days later if needed | Impossible inside a crew run; implemented as plain Python between two `kickoff()` calls, and the pause is only as durable as the calling process |
| Structured control flow | Explicit edges; the router is a unit-testable function | Task order plus prompt instructions; the model decides how faithfully to follow the selection rule |
| Determinism / testability | Whole graph runs keyless and deterministic; 24 of 28 tests exercise it end to end in CI | Construction is testable keyless; execution needs a live model, so CI covers wiring only |
| Facts in outputs | Optimizer output is computed, not generated; the model never touches the numbers | The recommendation passes through the model (`output_pydantic` constrains shape, not truth); the task prompt has to insist "do not invent values" |
| Boilerplate feel | More plumbing up front (state schema, reducers, edges) | Faster to stand up; roles/goals/backstories read naturally |
| Persistence | First-class checkpointer (SQLite here, Postgres in prod) | None built in for mid-run state |

Line counts are honest but almost beside the point: the volume is similar. Where the two diverge is *what the lines buy you*.

## What this actually taught me

1. **The approval gate is the discriminator.** The requirement "pause a half-finished run until a human decides, without losing state" is native in LangGraph and structurally impossible inside a CrewAI crew. If your workflow has a human in the middle (not just at the start or end), that alone decides the framework.

2. **LangGraph lets code stay code.** The monitor and optimizer are deterministic functions; they cost nothing, cannot hallucinate, and are trivially testable. CrewAI turns every step into an LLM conversation, which means paying tokens and accepting model risk on steps that never needed a model. The flip side: for genuinely fuzzy steps, CrewAI's agent abstraction is pleasant and fast to write.

3. **Guardrails don't care about the framework.** The same `validate_customer_message` runs on both implementations' output. Safety layers belong outside the orchestration layer, which is what makes them portable.

4. **CrewAI is quicker to demo, LangGraph is easier to trust.** Role/goal/backstory reads like a spec and produces something impressive in an afternoon. But every behavior lives in prose. The LangGraph version's behavior lives in code that a test can pin down.

## Runtime numbers

Requires a model key in `.env` so both sides use a real model (the LangGraph side then uses its LLM communicator; the CrewAI side always does). Any OpenAI-compatible provider works, including the free tiers of Groq and Google AI Studio; `.env.example` shows the three-line config for each:

```bash
uv sync --extra compare
make compare
```

| Implementation | Wall time | LLM requests | Total tokens |
|---|---|---|---|
| LangGraph | pending | pending | pending |
| CrewAI | pending | pending | pending |

(Method: `supplyagents/compare/benchmark.py`, default 3 runs per side on `suez-blockage`, override approved. The script prints this table ready to paste.)

Expectation before measuring, for the record: CrewAI should show several times the requests and tokens (two crews, every step reasoned) and correspondingly higher wall time; LangGraph should sit near a single LLM call. If the numbers say otherwise, that finding goes here unedited.

## Verdict

For this workflow: **LangGraph**, and it is not close, because of the durable human-in-the-loop gate and the deterministic cost/testability profile. **CrewAI** is the right reach when the steps are genuinely open-ended (research, synthesis, multi-perspective drafting), the crew runs unattended start to finish, and speed of authoring beats control.
