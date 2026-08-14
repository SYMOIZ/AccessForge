"""Simplified IAM-style action and resource matching for AccessForge.

This is NOT the complete AWS IAM authorization engine. Matching is limited to:
- exact strings
- '*' wildcards
- trailing or embedded '*' wildcards (for example s3:* or arn:aws:s3:::reports/*)
- case-insensitive action names

Unsupported IAM features return a 'needs-review' signal to the simulator.
"""

from __future__ import annotations

import re
from typing import Any


UNSUPPORTED_STATEMENT_KEYS = {
    "Condition",
    "Principal",
    "NotPrincipal",
}


def as_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item) for item in value]
    return [str(value)]


def wildcard_match(pattern: str, value: str, *, case_insensitive: bool = False) -> bool:
    if pattern == "*":
        return True
    flags = re.IGNORECASE if case_insensitive else 0
    regex = "^" + re.escape(pattern).replace("\\*", ".*").replace("\\?", ".") + "$"
    return re.match(regex, value, flags=flags) is not None


def action_matches(pattern: str, action: str) -> bool:
    return wildcard_match(pattern, action, case_insensitive=True)


def resource_matches(pattern: str, resource: str) -> bool:
    return wildcard_match(pattern, resource, case_insensitive=False)


def statement_is_unsupported(statement: dict[str, Any]) -> bool:
    if any(key in statement for key in UNSUPPORTED_STATEMENT_KEYS):
        return True
    if "NotAction" in statement or "NotResource" in statement:
        return True
    return False
