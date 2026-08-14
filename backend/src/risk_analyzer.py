"""Explainable policy risk analysis for AccessForge.

Rules are intentionally simple and implemented in code. Findings describe
policy shape, not proven real-world exploit impact.
"""

from __future__ import annotations

from typing import Any

from matching import as_list
from policy_validator import validate_policy_document

DELETE_HINTS = ("delete", "destroy", "remove")
WRITE_HINTS = ("put", "create", "update", "write", "invoke")
ADMIN_HINTS = ("*", "iam:", "organizations:", "account:")

HIGH = "HIGH"
MEDIUM = "MEDIUM"
LOW = "LOW"


def analyze_policy(policy: dict[str, Any]) -> dict[str, Any]:
    document = validate_policy_document(policy)
    statements = document["Statement"]
    if not isinstance(statements, list):
        statements = [statements]

    findings: list[dict[str, str]] = []
    for index, statement in enumerate(statements):
        if statement.get("Effect") != "Allow":
            continue
        actions = [item.lower() for item in as_list(statement.get("Action"))]
        resources = as_list(statement.get("Resource"))
        sid = str(statement.get("Sid", f"Statement[{index}]"))
        findings.extend(_action_findings(sid, actions, resources))
        findings.extend(_resource_findings(sid, actions, resources))

    level = _overall_level(findings)
    return {
        "level": level,
        "findings": findings,
        "summary": _summary(level, findings),
        "disclaimer": (
            "Risk ratings describe the shape of this simulated policy. "
            "They are not a complete security assessment of a live AWS account."
        ),
    }


def _action_findings(sid: str, actions: list[str], resources: list[str]) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    joined_resources = ", ".join(resources)
    for action in actions:
        if action == "*":
            findings.append(
                {
                    "level": HIGH,
                    "code": "wildcard-action",
                    "reason": f"{sid} allows action '*' on {joined_resources}.",
                    "recommendation": "Replace * with the specific actions the identity needs.",
                }
            )
        elif action.endswith(":*"):
            findings.append(
                {
                    "level": HIGH,
                    "code": "service-wildcard-action",
                    "reason": f"{sid} allows wildcard action '{action}' on {joined_resources}.",
                    "recommendation": "List only the required service actions instead of a service-wide wildcard.",
                }
            )
        if any(hint in action for hint in DELETE_HINTS):
            findings.append(
                {
                    "level": HIGH if _is_broad_resource(resources) else MEDIUM,
                    "code": "delete-permission",
                    "reason": f"{sid} allows delete-style action '{action}' on {joined_resources}.",
                    "recommendation": "Restrict delete actions to a specific resource and consider an explicit Deny for production data.",
                }
            )
        if any(hint in action for hint in WRITE_HINTS):
            findings.append(
                {
                    "level": MEDIUM if not _is_broad_resource(resources) else HIGH,
                    "code": "write-permission",
                    "reason": f"{sid} allows write-style action '{action}' on {joined_resources}.",
                    "recommendation": "Confirm write access is required and scope it to a specific resource.",
                }
            )
        if any(action == hint or action.startswith(hint) for hint in ADMIN_HINTS if hint != "*"):
            findings.append(
                {
                    "level": HIGH,
                    "code": "administrative-access",
                    "reason": f"{sid} includes administrative-level action '{action}'.",
                    "recommendation": "Keep administrative actions out of application and analyst policies.",
                }
            )
    return findings


def _resource_findings(sid: str, actions: list[str], resources: list[str]) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    action_list = ", ".join(actions)
    for resource in resources:
        if resource == "*":
            findings.append(
                {
                    "level": HIGH,
                    "code": "wildcard-resource",
                    "reason": f"{sid} allows {action_list} on resource '*'.",
                    "recommendation": "Replace * with a specific ARN, bucket, table, or function.",
                }
            )
        elif resource.endswith("/*") or resource.endswith("*"):
            findings.append(
                {
                    "level": MEDIUM,
                    "code": "broad-resource-scope",
                    "reason": f"{sid} uses a broad resource pattern '{resource}'.",
                    "recommendation": "Restrict the resource to a specific bucket/path, table, or function if possible.",
                }
            )
        if ":table/" in resource and resource.endswith("/*"):
            findings.append(
                {
                    "level": MEDIUM,
                    "code": "excessive-permissions",
                    "reason": f"{sid} may over-scope DynamoDB access with '{resource}'.",
                    "recommendation": "Use the table ARN unless item-level conditions are actually required.",
                }
            )
    return findings


def _is_broad_resource(resources: list[str]) -> bool:
    return any(item == "*" or item.endswith("*") for item in resources)


def _overall_level(findings: list[dict[str, str]]) -> str:
    if any(item["level"] == HIGH for item in findings):
        return HIGH
    if any(item["level"] == MEDIUM for item in findings):
        return MEDIUM
    return LOW


def _summary(level: str, findings: list[dict[str, str]]) -> str:
    if not findings:
        return "No high-level risk patterns were detected by the AccessForge rule set."
    return f"{level} risk: {len(findings)} finding(s) based on wildcard, write, delete, or broad-scope rules."
