"""Guardrail behavior: allowlist, message validation, approval threshold."""

import pytest

from supplyagents.guardrails import (
    GuardrailViolation,
    check_action,
    requires_human_approval,
    validate_customer_message,
)
from supplyagents.state import RouteOption


def _option(cost_delta: float) -> RouteOption:
    return {
        "route_id": "R-330",
        "label": "test",
        "description": "test option",
        "cost_delta": cost_delta,
        "eta_delta_hours": 24,
    }


def test_allowlisted_actions_pass():
    check_action("monitor.poll")
    check_action("optimizer.propose")
    check_action("communicator.draft")


def test_send_is_not_allowlisted():
    # Drafting is allowed, sending is not. This is the least-privilege core.
    with pytest.raises(GuardrailViolation):
        check_action("communicator.send")


def test_unknown_action_is_rejected():
    with pytest.raises(GuardrailViolation):
        check_action("optimizer.execute_booking")


def test_message_must_reference_route():
    with pytest.raises(GuardrailViolation):
        validate_customer_message("Your shipment is delayed.", "R-201")


def test_message_must_not_leak_internal_vocabulary():
    with pytest.raises(GuardrailViolation):
        validate_customer_message(
            "Route R-201 is delayed. Our internal margin is unaffected.", "R-201"
        )


def test_valid_message_passes():
    validate_customer_message("Route R-201 is delayed by 18 hours. We are on it.", "R-201")


def test_approval_threshold_boundary():
    assert requires_human_approval(_option(0.22), threshold=0.15)
    assert not requires_human_approval(_option(0.09), threshold=0.15)
    # Exactly at the threshold does not require approval; only exceeding it does.
    assert not requires_human_approval(_option(0.15), threshold=0.15)
