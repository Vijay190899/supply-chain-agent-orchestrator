"""HTTP surface for the orchestrator, for deployment on Cloud Run.

The CLI is still the primary way to explore this locally; the service exposes
the same runner over HTTP so the workflow can run behind a public URL.

    GET  /            service info and known scenarios
    GET  /healthz     liveness probe
    POST /run         run a scenario, body: {scenario, decision}
"""

from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from supplyagents import providers
from supplyagents.runner import run_scenario

app = FastAPI(
    title="Supply-chain agent orchestrator",
    version="0.6.0",
    summary="Multi-agent logistics disruption response (LangGraph).",
)


class RunRequest(BaseModel):
    scenario: str
    decision: Literal["approved", "rejected"] = "approved"


@app.get("/")
def root() -> dict:
    return {
        "service": "supply-chain-agent-orchestrator",
        "scenarios": providers.known_scenarios(),
        "usage": 'POST /run with {"scenario": "suez-blockage", "decision": "approved"}',
    }


@app.get("/healthz")
def healthz() -> dict:
    return {"status": "ok"}


@app.post("/run")
def run(request: RunRequest) -> dict:
    if request.scenario not in providers.known_scenarios():
        raise HTTPException(
            status_code=422,
            detail=f"Unknown scenario. Known: {providers.known_scenarios()}",
        )
    return run_scenario(request.scenario, request.decision)
