"""Deterministic access-request simulator.

Supported rules (MVP):
1. Explicit Deny that matches action AND resource -> DENIED
2. Allow that matches action AND resource, and no matching Deny -> ALLOWED
3. No matching Allow -> DENIED
4. Statement uses Condition, Principal, NotAction, or NotResource -> NEEDS REVIEW
   if that statement is the only potential match, or if evaluation cannot be confident.

This does not reproduce the complete AWS IAM authorization engine.
"""

from __future__ import annotations

from typing import Any

from matching import action_matches, as_list, resource_matches, statement_is_unsupported
from policy_validator import validate_policy_document

ALLOWED = "ALLOWED"
DENIED = "DENIED"
NEEDS_REVIEW = "NEEDS_REVIEW"


def simulate_access(
    policy: dict[str, Any],
    *,
    action: str,
    resource: str,
) -> dict[str, Any]:
    if not action or not action.strip():
        raise ValueError("Simulation action is required.")
    if not resource or not resource.strip():
        raise ValueError("Simulation resource is required.")

    document = validate_policy_document(policy)
    statements = document["Statement"]
    if not isinstance(statements, list):
        statements = [statements]

    matching_denies: list[dict[str, Any]] = []
    matching_allows: list[dict[str, Any]] = []
    review_hits: list[str] = []

    for index, statement in enumerate(statements):
        if statement_is_unsupported(statement):
            review_hits.append(
                f"Statement[{index}] uses Condition, Principal, NotAction, or NotResource, "
                "which this simulator does not evaluate."
            )
            continue

        actions = as_list(statement.get("Action"))
        resources = as_list(statement.get("Resource"))
        action_hit = any(action_matches(pattern, action) for pattern in actions)
        resource_hit = any(resource_matches(pattern, resource) for pattern in resources)
        if not (action_hit and resource_hit):
            continue

        effect = statement.get("Effect")
        sid = statement.get("Sid", f"Statement[{index}]")
        if effect == "Deny":
            matching_denies.append({"sid": sid, "index": index})
        elif effect == "Allow":
            matching_allows.append({"sid": sid, "index": index})

    if matching_denies:
        deny = matching_denies[0]
        return {
            "decision": DENIED,
            "reason": (
                f"Denied because an explicit Deny statement ({deny['sid']}) matches "
                "both the requested action and resource. Explicit Deny takes precedence."
            ),
            "matchedAllow": matching_allows,
            "matchedDeny": matching_denies,
            "engine": "AccessForge deterministic simulator (not the full AWS IAM engine)",
        }

    if review_hits and not matching_allows:
        return {
            "decision": NEEDS_REVIEW,
            "reason": " ".join(review_hits)
            + " No confident Allow/Deny match could be produced.",
            "matchedAllow": matching_allows,
            "matchedDeny": matching_denies,
            "engine": "AccessForge deterministic simulator (not the full AWS IAM engine)",
        }

    if matching_allows:
        allow = matching_allows[0]
        reason = (
            f"Allowed because an Allow statement ({allow['sid']}) matches both the "
            "requested action and resource, and no matching explicit Deny was found."
        )
        if review_hits:
            reason += " Note: some statements were skipped as unsupported."
        return {
            "decision": ALLOWED,
            "reason": reason,
            "matchedAllow": matching_allows,
            "matchedDeny": matching_denies,
            "engine": "AccessForge deterministic simulator (not the full AWS IAM engine)",
        }

    return {
        "decision": DENIED,
        "reason": (
            "Denied because no Allow statement matched both the requested action "
            "and resource."
        ),
        "matchedAllow": matching_allows,
        "matchedDeny": matching_denies,
        "engine": "AccessForge deterministic simulator (not the full AWS IAM engine)",
    }
