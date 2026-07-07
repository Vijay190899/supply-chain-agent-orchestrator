"""Runtime guardrails for agent actions and outputs.

Least privilege, enforced in code rather than in the prompt:
- agents can only take actions on the allowlist (draft yes, send no),
- customer-facing text is validated before it lands in state,
- cost overrides above the threshold never bypass the human approval gate
  (that part is enforced structurally, by the graph's routing).
"""

from supplyagents.state import RouteOption

# Everything an agent is permitted to do. "communicator.send" is deliberately
# absent: this system drafts, a human (or a downstream system with its own
# controls) sends.
ALLOWED_ACTIONS: frozenset[str] = frozenset(
    {
        "monitor.poll",
        "optimizer.propose",
        "communicator.draft",
    }
)

# Internal vocabulary that must never leak into a customer message.
_FORBIDDEN_PHRASES: tuple[str, ...] = (
    "internal margin",
    "cost basis",
    "override code",
    "profit",
)

_MAX_MESSAGE_CHARS = 1200


class GuardrailViolation(Exception):
    """An agent attempted something outside its permitted scope."""


def check_action(action: str) -> None:
    """Reject any action that is not explicitly allowlisted."""
    if action not in ALLOWED_ACTIONS:
        raise GuardrailViolation(
            f"Action {action!r} is not allowlisted. Allowed: {sorted(ALLOWED_ACTIONS)}"
        )


def validate_customer_message(text: str, route_id: str) -> None:
    """Validate a drafted customer message before it is stored.

    The message must reference the affected route, stay within a sane length,
    and contain no internal-only vocabulary.
    """
    if route_id not in text:
        raise GuardrailViolation(f"Customer message must reference route {route_id!r}.")
    if len(text) > _MAX_MESSAGE_CHARS:
        raise GuardrailViolation(
            f"Customer message exceeds {_MAX_MESSAGE_CHARS} characters ({len(text)})."
        )
    lowered = text.lower()
    for phrase in _FORBIDDEN_PHRASES:
        if phrase in lowered:
            raise GuardrailViolation(f"Customer message contains forbidden phrase {phrase!r}.")


def requires_human_approval(option: RouteOption, threshold: float) -> bool:
    """True when a proposed option's cost delta exceeds the approval threshold."""
    return option["cost_delta"] > threshold
