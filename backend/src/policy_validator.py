"""Validate IAM-style policy documents used by AccessForge."""

from __future__ import annotations

import json
from typing import Any

IAM_POLICY_VERSION = "2012-10-17"
VALID_EFFECTS = {"Allow", "Deny"}


class PolicyValidationError(Exception):
    pass


def _as_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    return [value]


def validate_policy_json(raw: str) -> dict[str, Any]:
    try:
        document = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise PolicyValidationError(f"Invalid policy JSON: {exc.msg}") from exc
    validate_policy_document(document)
    return document


def validate_policy_document(document: Any) -> dict[str, Any]:
    if not isinstance(document, dict):
        raise PolicyValidationError("Policy must be a JSON object.")
    version = document.get("Version")
    if version != IAM_POLICY_VERSION:
        raise PolicyValidationError(
            f"Policy Version must be '{IAM_POLICY_VERSION}'."
        )
    statements = document.get("Statement")
    if not statements:
        raise PolicyValidationError("Policy must include at least one Statement.")
    if not isinstance(statements, list):
        statements = [statements]
        document = {**document, "Statement": statements}

    for index, statement in enumerate(statements):
        _validate_statement(statement, index)
    return document


def _validate_statement(statement: Any, index: int) -> None:
    prefix = f"Statement[{index}]"
    if not isinstance(statement, dict):
        raise PolicyValidationError(f"{prefix} must be an object.")
    effect = statement.get("Effect")
    if effect not in VALID_EFFECTS:
        raise PolicyValidationError(f"{prefix}.Effect must be Allow or Deny.")
    if "Action" not in statement and "NotAction" not in statement:
        raise PolicyValidationError(f"{prefix} must include Action or NotAction.")
    if "Resource" not in statement and "NotResource" not in statement:
        raise PolicyValidationError(f"{prefix} must include Resource or NotResource.")

    for field in ("Action", "NotAction"):
        if field in statement:
            actions = _as_list(statement[field])
            if not actions or any(not isinstance(item, str) or not item.strip() for item in actions):
                raise PolicyValidationError(f"{prefix}.{field} must be a non-empty string or list of strings.")

    for field in ("Resource", "NotResource"):
        if field in statement:
            resources = _as_list(statement[field])
            if not resources or any(not isinstance(item, str) or not item.strip() for item in resources):
                raise PolicyValidationError(f"{prefix}.{field} must be a non-empty string or list of strings.")
