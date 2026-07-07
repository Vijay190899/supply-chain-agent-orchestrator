"""Test harness defaults.

Unit tests must behave the same on any machine, including one whose .env
holds real provider keys. Environment variables outrank dotenv values in
pydantic-settings, so blanking them here forces the deterministic
(template) code paths. Tests that deliberately go live re-inject the real
key via the `real_openai_key` fixture, which reads the dotenv file
directly (import-time environment state is unreliable: crewai calls
load_dotenv() when imported).
"""

import pytest
from dotenv import dotenv_values


@pytest.fixture(autouse=True)
def _deterministic_env(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "")
    monkeypatch.setenv("LANGFUSE_PUBLIC_KEY", "")
    monkeypatch.setenv("LANGFUSE_SECRET_KEY", "")
    monkeypatch.setenv("LANGSMITH_API_KEY", "")


@pytest.fixture
def real_openai_key() -> str:
    """The developer's actual key from .env, for tests that deliberately go live."""
    return dotenv_values(".env").get("OPENAI_API_KEY") or ""
