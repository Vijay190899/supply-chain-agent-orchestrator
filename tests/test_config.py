"""Smoke tests so CI is green from day one."""

from supplyagents import __version__
from supplyagents.config import get_settings


def test_version_is_set():
    assert __version__


def test_approval_threshold_default():
    settings = get_settings()
    # The 15% human-in-the-loop rule is a core requirement, so pin it.
    assert settings.human_approval_threshold == 0.15
