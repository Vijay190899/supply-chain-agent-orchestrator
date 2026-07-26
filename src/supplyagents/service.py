"""HTTP surface for the orchestrator, for deployment on Cloud Run.

The CLI is still the primary way to explore this locally; the service exposes
the same runner over HTTP so the workflow can run behind a public URL, plus
streaming endpoints that drive the web UI.

    GET  /                 service info and known scenarios
    GET  /healthz          liveness probe
    POST /run              run a scenario in one shot, body: {scenario, decision}
    POST /api/runs         start a run, streams NDJSON, pauses at the approval gate
    POST /api/runs/resume  resume a paused run with a decision, streams the rest
"""

import uuid
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from supplyagents import providers
from supplyagents.runner import run_scenario
from supplyagents.streaming import stream_run

app = FastAPI(
    title="Supply-chain agent orchestrator",
    version="0.7.0",
    summary="Multi-agent logistics disruption response (LangGraph).",
)

# Public demo API: the web UI is served from a different origin (Vercel), so
# allow cross-origin calls. Tighten to the known frontend origin for anything
# beyond a portfolio demo.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

NDJSON = "application/x-ndjson"


class RunRequest(BaseModel):
    scenario: str
    decision: Literal["approved", "rejected"] = "approved"


class StartRequest(BaseModel):
    scenario: str


class ResumeRequest(BaseModel):
    thread_id: str
    scenario: str = ""
    decision: Literal["approved", "rejected"] = "approved"


def _require_scenario(scenario: str) -> None:
    if scenario not in providers.known_scenarios():
        raise HTTPException(
            status_code=422,
            detail=f"Unknown scenario. Known: {providers.known_scenarios()}",
        )


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
    _require_scenario(request.scenario)
    return run_scenario(request.scenario, request.decision)


@app.post("/api/runs")
def start_run(request: StartRequest) -> StreamingResponse:
    """Start a run and stream node events; pauses at the approval gate."""
    _require_scenario(request.scenario)
    thread_id = f"web-{uuid.uuid4().hex[:8]}"
    return StreamingResponse(stream_run(request.scenario, thread_id), media_type=NDJSON)


@app.post("/api/runs/resume")
def resume_run(request: ResumeRequest) -> StreamingResponse:
    """Resume a paused run with the human decision and stream the remainder."""
    return StreamingResponse(
        stream_run(request.scenario, request.thread_id, resume=request.decision),
        media_type=NDJSON,
    )
