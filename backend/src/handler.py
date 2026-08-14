"""API Gateway HTTP API Lambda handler for AccessForge."""

from __future__ import annotations

import json
import logging
import os
from typing import Any

from botocore.exceptions import ClientError

from ai_advisor import AdvisorError, advise
from catalog import load_catalog
from exports import ExportError, export_policy
from policy_generator import generate_policy
from policy_validator import PolicyValidationError, validate_policy_document
from risk_analyzer import analyze_policy
from scenarios import (
    ScenarioError,
    ScenarioNotFoundError,
    create_scenario,
    dashboard_stats,
    delete_scenario,
    get_scenario,
    list_scenarios,
    safe_client_error,
    update_scenario,
)
from simulator import simulate_access

logger = logging.getLogger()
logger.setLevel(logging.INFO)

CORS_HEADERS = {
    "Access-Control-Allow-Origin": os.environ.get("CORS_ORIGIN", "*"),
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Content-Type": "application/json",
}


def _response(status: int, body: dict[str, Any]) -> dict[str, Any]:
    return {"statusCode": status, "headers": CORS_HEADERS, "body": json.dumps(body)}


def _error(status: int, message: str) -> dict[str, Any]:
    return _response(status, {"error": message})


def _user_id(event: dict[str, Any]) -> str | None:
    claims = (
        event.get("requestContext", {})
        .get("authorizer", {})
        .get("jwt", {})
        .get("claims", {})
    )
    return claims.get("sub")


def _path(event: dict[str, Any]) -> str:
    raw = event.get("rawPath") or event.get("path") or "/"
    stage = event.get("requestContext", {}).get("stage")
    if stage and raw.startswith(f"/{stage}"):
        raw = raw[len(stage) + 1 :] or "/"
    return raw.rstrip("/") or "/"


def _body(event: dict[str, Any]) -> dict[str, Any]:
    raw = event.get("body") or "{}"
    if event.get("isBase64Encoded"):
        import base64

        raw = base64.b64decode(raw).decode("utf-8")
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError("Request body must be valid JSON.") from exc
    if not isinstance(parsed, dict):
        raise ValueError("Request body must be a JSON object.")
    return parsed


def lambda_handler(event: dict[str, Any], _context: Any) -> dict[str, Any]:
    method = (event.get("requestContext", {}).get("http", {}).get("method") or event.get("httpMethod") or "GET").upper()
    path = _path(event)
    logger.info("api_request method=%s path=%s", method, path)

    if method == "OPTIONS":
        return _response(200, {"ok": True})

    try:
        if method == "GET" and path == "/health":
            return _response(
                200,
                {
                    "status": "ok",
                    "service": "accessforge",
                    "services": ["amplify", "cognito", "apigateway", "lambda", "dynamodb", "s3", "bedrock", "cloudwatch"],
                    "bedrockModel": os.environ.get("BEDROCK_MODEL_ID", "amazon.nova-lite-v1:0"),
                },
            )
        if method == "GET" and path == "/catalog":
            return _response(200, load_catalog())

        user_id = _user_id(event)
        if not user_id:
            logger.info("api_unauthenticated path=%s", path)
            return _error(401, "Authentication required.")

        return _route(method, path, event, user_id)
    except ScenarioNotFoundError as exc:
        return _error(404, str(exc))
    except ScenarioError as exc:
        return _error(400, str(exc))
    except ValueError as exc:
        logger.info("api_bad_request error=%s", str(exc))
        return _error(400, str(exc))
    except PolicyValidationError as exc:
        logger.info("api_invalid_policy error=%s", str(exc))
        return _error(400, str(exc))
    except AdvisorError as exc:
        logger.info("api_advisor_error error=%s", str(exc))
        return _error(422, str(exc))
    except ExportError as exc:
        logger.info("api_export_error error=%s", str(exc))
        return _error(400, str(exc))
    except ClientError as exc:
        logger.exception("aws_client_error code=%s", safe_client_error(exc))
        return _error(500, "A backend service error occurred.")
    except Exception:
        logger.exception("api_unhandled_error")
        return _error(500, "An unexpected error occurred.")


def _route(method: str, path: str, event: dict[str, Any], user_id: str) -> dict[str, Any]:
    if method == "GET" and path == "/dashboard":
        return _response(200, dashboard_stats(user_id))

    if method == "GET" and path == "/scenarios":
        return _response(200, {"items": list_scenarios(user_id)})

    if method == "POST" and path == "/scenarios":
        item = create_scenario(user_id, _body(event))
        logger.info("scenario_save success id=%s", item["scenarioId"])
        return _response(201, item)

    if path.startswith("/scenarios/"):
        scenario_id = path.split("/", 2)[2]
        if not scenario_id:
            return _error(400, "Scenario id is required.")
        if method == "GET":
            return _response(200, get_scenario(user_id, scenario_id))
        if method == "PUT":
            item = update_scenario(user_id, scenario_id, _body(event))
            logger.info("scenario_update success id=%s", scenario_id)
            return _response(200, item)
        if method == "DELETE":
            delete_scenario(user_id, scenario_id)
            logger.info("scenario_delete success id=%s", scenario_id)
            return _response(200, {"deleted": True, "scenarioId": scenario_id})

    if method == "POST" and path == "/generate-policy":
        body = _body(event)
        policy = generate_policy(
            allow_actions=body.get("actions") or body.get("allowActions") or [],
            resource=body.get("resources") or body.get("resource") or [],
            deny_actions=body.get("deniedActions") or body.get("denyActions") or [],
        )
        logger.info("policy_generate success")
        return _response(200, {"policy": policy})

    if method == "POST" and path == "/simulate":
        body = _body(event)
        policy = body.get("policy")
        if not policy:
            raise ValueError("policy is required.")
        result = simulate_access(
            validate_policy_document(policy),
            action=str(body.get("action", "")),
            resource=str(body.get("resource", "")),
        )
        logger.info("simulate_success decision=%s", result["decision"])
        return _response(200, result)

    if method == "POST" and path == "/analyze":
        body = _body(event)
        policy = body.get("policy")
        if not policy:
            raise ValueError("policy is required.")
        analysis = analyze_policy(validate_policy_document(policy))
        logger.info("analyze_success level=%s", analysis["level"])
        return _response(200, analysis)

    if method == "POST" and path == "/ai-advisor":
        body = _body(event)
        prompt = str(body.get("prompt") or body.get("request") or "")
        result = advise(prompt)
        logger.info("advisor_success")
        return _response(200, result)

    if method == "POST" and path == "/export-policy":
        body = _body(event)
        policy = body.get("policy")
        if not policy:
            raise ValueError("policy is required.")
        result = export_policy(user_id, policy)
        return _response(200, result)

    return _error(404, "Not found.")
