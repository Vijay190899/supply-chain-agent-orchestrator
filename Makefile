.PHONY: install lint format test eval run docker bench help

help:
	@echo "install  - create venv and install deps with uv"
	@echo "lint     - ruff check + format check"
	@echo "format   - ruff format"
	@echo "test     - run pytest (deterministic, network-free)"
	@echo "eval     - run the behavioral invariant gate (business rules that must always hold)"
	@echo "run      - run a simulated disruption scenario (CLI)"
	@echo "serve    - start the HTTP service on :8080"
	@echo "docker   - build the container image"
	@echo "bench    - benchmark LangGraph vs CrewAI, write results JSON + regenerate the table"

install:
	uv sync --extra dev

lint:
	uv run ruff check .
	uv run ruff format --check .

format:
	uv run ruff format .

test:
	uv run pytest

eval:
	uv run pytest tests/test_invariants.py -v

run:
	uv run python -m supplyagents.simulate

serve:
	uv run uvicorn supplyagents.service:app --reload --port 8080

docker:
	docker build -t supplyagents:local .

bench:
	uv sync --extra dev --extra compare
	uv run python -m supplyagents.compare.benchmark
