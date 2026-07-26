FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

COPY pyproject.toml uv.lock ./
COPY src ./src
RUN uv sync --no-dev --frozen

ENV PATH="/app/.venv/bin:$PATH"
# Cloud Run provides PORT; default to 8080 for local runs.
ENV PORT=8080
EXPOSE 8080

# Serve the orchestrator HTTP API. Shell form so $PORT expands at runtime.
CMD exec uvicorn supplyagents.service:app --host 0.0.0.0 --port ${PORT}
