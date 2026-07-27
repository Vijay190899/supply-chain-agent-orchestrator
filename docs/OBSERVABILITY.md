# Observability

Two layers, deliberately separate, so a run is never invisible and the demo
never needs an account.

## Layer 1: local timings, always on

`observability.RunTimer` is a LangChain callback that records wall time per
graph node. It needs no keys and no network, runs in every simulation and in
CI, and the CLI prints a per-node report after each run:

```
-- node timings --
   monitor           0.2 ms
   optimizer         0.5 ms
   human_approval    0.0 ms
   communicator   1573.6 ms
```

## Layer 2: exporters, opt-in

`observability.tracing_callbacks(settings)` attaches **Langfuse** (and/or
**LangSmith**) only when their keys are present. `enabled_exporters` is pure,
unit-tested decision logic; the CLI header states which exporters are live or
that tracing is off. No keys, no export, no pretending.

Enable Langfuse (free, EU-hosted, fits the sovereignty story):

```bash
# in .env
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_HOST=https://cloud.langfuse.com
```

Then every run streams a trace: the `monitor → optimizer → human_approval →
communicator` path, with per-node latency and, on the communicator, token
spend. The human-in-the-loop interrupt is visible as a genuine pause in the
trace, not a single flat span.

## What a trace shows

- One span per graph node, nested under the run.
- The `human_approval` node appears as a real interrupt boundary: the run
  suspends there and resumes as a separate segment after the decision.
- Token usage and model on the communicator's LLM call.
- Guardrail validation as part of the communicator span (a rejected message
  shows up as a failed run, not a silent pass).

## Benchmark runs are traceable too

`make bench` tags each LangGraph run `session=bench` with tags
`[bench, langgraph, <scenario>, <git-sha>]`. Open Langfuse, filter to the
`bench` session, and the request count in a trace matches the number in
[COMPARISON.md](COMPARISON.md): the table and the traces cross-check each
other, which is the point of "observable" rather than "asserted."

## Benchmark provenance

Beyond tracing, every `make bench` writes a dated JSON to
[compare/results/](../compare/results/) with every per-run datapoint plus the
git SHA, model, provider, Python version, and package versions, and
regenerates the COMPARISON.md table between its markers. The number in the doc
always traces to a committed, reproducible artifact.

## What this is not

No LLM-quality eval (no Ragas): this project is orchestration, not RAG, so a
retrieval-eval score would be cargo-culting. The honest equivalent is the
**behavioral invariant gate** (`make eval`, `tests/test_invariants.py`):
deterministic assertions that the approval gate triggers iff cost Δ exceeds
15%, the optimizer picks the cheapest option under the ETA cap, agents may
draft but never send, and a rejected override still issues a delay notice.
Those run keyless in CI and are the evals that actually protect the system.
