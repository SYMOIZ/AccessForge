"""Generate IAM-style policy documents from playground selections."""

from __future__ import annotations

from typing import Any

from catalog import is_known_action
from policy_validator import PolicyValidationError, validate_policy_document

IAM_POLICY_VERSION = "2012-10-17"


def _normalize_list(value: str | list[str] | None) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [value] if value.strip() else []
    return [item for item in value if isinstance(item, str) and item.strip()]


def generate_policy(
    *,
    allow_actions: str | list[str],
    resource: str | list[str],
    deny_actions: str | list[str] | None = None,
    deny_resource: str | list[str] | None = None,
    sid_prefix: str = "AccessForge",
) -> dict[str, Any]:
    allows = _normalize_list(allow_actions)
    resources = _normalize_list(resource)
    denies = _normalize_list(deny_actions)
    deny_resources = _normalize_list(deny_resource) or resources

    if not allows:
        raise PolicyValidationError("At least one Allow action is required.")
    if not resources:
        raise PolicyValidationError("At least one resource is required.")

    for action in allows + denies:
        if not is_known_action(action):
            raise PolicyValidationError(f"Unknown or unsupported action: {action}")

    statements: list[dict[str, Any]] = [
        {
            "Sid": f"{sid_prefix}Allow",
            "Effect": "Allow",
            "Action": allows if len(allows) > 1 else allows[0],
            "Resource": resources if len(resources) > 1 else resources[0],
        }
    ]
    if denies:
        statements.append(
            {
                "Sid": f"{sid_prefix}Deny",
                "Effect": "Deny",
                "Action": denies if len(denies) > 1 else denies[0],
                "Resource": deny_resources if len(deny_resources) > 1 else deny_resources[0],
            }
        )

    policy = {"Version": IAM_POLICY_VERSION, "Statement": statements}
    validate_policy_document(policy)
    return policy
