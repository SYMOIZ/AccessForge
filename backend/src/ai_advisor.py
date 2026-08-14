"""Amazon Bedrock policy advisor with strict JSON validation."""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from catalog import is_known_action, load_catalog
from policy_generator import generate_policy
from policy_validator import PolicyValidationError, validate_policy_document
from risk_analyzer import analyze_policy

logger = logging.getLogger(__name__)

REQUIRED_FIELDS = (
    "identity",
    "resources",
    "actions",
    "denied_actions",
    "policy",
    "explanation",
    "risks",
)


class AdvisorError(Exception):
    pass


def _extract_json(text: str) -> dict[str, Any]:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = re.sub(r"^```(?:json)?\s*", "", stripped)
        stripped = re.sub(r"\s*```$", "", stripped)
    try:
        parsed = json.loads(stripped)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", stripped, flags=re.DOTALL)
    if not match:
        raise AdvisorError("The model did not return JSON.")
    try:
        parsed = json.loads(match.group(0))
    except json.JSONDecodeError as exc:
        raise AdvisorError("The model returned malformed JSON.") from exc
    if not isinstance(parsed, dict):
        raise AdvisorError("The model JSON must be an object.")
    return parsed


def validate_advisor_payload(payload: dict[str, Any]) -> dict[str, Any]:
    missing = [field for field in REQUIRED_FIELDS if field not in payload]
    if missing:
        raise AdvisorError(f"AI response missing fields: {', '.join(missing)}")

    identity = payload.get("identity")
    if not isinstance(identity, str) or not identity.strip():
        raise AdvisorError("identity must be a non-empty string.")

    resources = payload.get("resources")
    actions = payload.get("actions")
    denied_actions = payload.get("denied_actions")
    if not isinstance(resources, list) or not resources or not all(isinstance(item, str) and item.strip() for item in resources):
        raise AdvisorError("resources must be a non-empty list of strings.")
    if not isinstance(actions, list) or not actions or not all(isinstance(item, str) and item.strip() for item in actions):
        raise AdvisorError("actions must be a non-empty list of strings.")
    if not isinstance(denied_actions, list) or not all(isinstance(item, str) for item in denied_actions):
        raise AdvisorError("denied_actions must be a list of strings.")
    if not isinstance(payload.get("explanation"), str) or not payload["explanation"].strip():
        raise AdvisorError("explanation must be a non-empty string.")
    if not isinstance(payload.get("risks"), list):
        raise AdvisorError("risks must be a list.")

    for action in actions + denied_actions:
        if action and not is_known_action(action):
            raise AdvisorError(f"Unsupported action in AI response: {action}")

    try:
        policy = validate_policy_document(payload["policy"])
    except PolicyValidationError as exc:
        try:
            policy = generate_policy(
                allow_actions=actions,
                resource=resources,
                deny_actions=denied_actions,
            )
        except PolicyValidationError as inner:
            raise AdvisorError(f"AI policy was invalid: {exc}") from inner
        payload = {**payload, "policy": policy}
    else:
        payload = {**payload, "policy": policy}

    payload["riskAnalysis"] = analyze_policy(payload["policy"])
    payload["disclaimer"] = "AI-generated recommendation — review before use."
    return payload


def _system_prompt() -> str:
    catalog = load_catalog()
    allowed_actions = []
    for resource in catalog["resources"]:
        for item in resource["actions"]:
            allowed_actions.append(item["action"])
    identities = [item["name"] for item in catalog["identities"]]
    return (
        "You are AccessForge, an educational AWS IAM policy advisor. "
        "Return ONLY valid JSON with keys: identity, resources, actions, "
        "denied_actions, policy, explanation, risks. "
        "Use IAM policy Version 2012-10-17. "
        f"Choose identity from: {', '.join(identities)}. "
        f"Use only these actions: {', '.join(allowed_actions)}. "
        "Resources must be example/simulated ARNs, labeled in explanation as simulated. "
        "Never claim the policy will be attached to a real AWS identity. "
        "Keep permissions least-privilege. Prefer explicit Deny for dangerous actions the user forbids."
    )


def advise(prompt: str, *, model_id: str | None = None) -> dict[str, Any]:
    if not prompt or not prompt.strip():
        raise AdvisorError("A natural-language request is required.")

    model = model_id or os.environ.get("BEDROCK_MODEL_ID", "amazon.nova-lite-v1:0")
    client = boto3.client("bedrock-runtime", region_name=os.environ.get("AWS_REGION", "us-east-1"))
    logger.info("bedrock_invoke_start model=%s", model)
    try:
        response = client.converse(
            modelId=model,
            system=[{"text": _system_prompt()}],
            messages=[{"role": "user", "content": [{"text": prompt.strip()}]}],
            inferenceConfig={"maxTokens": 1200, "temperature": 0.2},
        )
    except ClientError as exc:
        logger.exception("bedrock_invoke_failure")
        code = exc.response.get("Error", {}).get("Code", "ClientError")
        raise AdvisorError(f"Bedrock request failed ({code}).") from exc
    except BotoCoreError as exc:
        logger.exception("bedrock_invoke_failure")
        raise AdvisorError("Bedrock request failed.") from exc

    chunks = response.get("output", {}).get("message", {}).get("content", [])
    text = "".join(part.get("text", "") for part in chunks if isinstance(part, dict))
    if not text.strip():
        logger.error("bedrock_invoke_empty")
        raise AdvisorError("Bedrock returned an empty response.")

    logger.info("bedrock_invoke_success")
    parsed = _extract_json(text)
    return validate_advisor_payload(parsed)
