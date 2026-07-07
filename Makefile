.PHONY: install lint format test run docker compare help

help:
	@echo "install  - create venv and install deps with uv"
	@echo "lint     - ruff check + format check"
	@echo "format   - ruff format"
	@echo "test     - run pytest"
	@echo "run      - run a simulated disruption scenario"
	@echo "docker   - build the container image"
	@echo "compare  - benchmark LangGraph vs CrewAI (needs OPENAI_API_KEY + compare extra)"

install:
	uv sync --extra dev

lint:
	uv run ruff check .
	uv run ruff format --check .

format:
	uv run ruff format .

test:
	uv run pytest

run:
	uv run python -m supplyagents.simulate

docker:
	docker build -t supplyagents:local .

compare:
	uv sync --extra dev --extra compare
	uv run python -m supplyagents.compare.benchmark
