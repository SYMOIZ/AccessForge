"""DynamoDB scenario storage scoped to the authenticated Cognito user."""

from __future__ import annotations

import os
import time
import uuid
from decimal import Decimal
from typing import Any

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

PK_PREFIX = "USER#"
SK_PREFIX = "SCENARIO#"
STATS_SK = "STATS"


class ScenarioError(Exception):
    pass


class ScenarioNotFoundError(ScenarioError):
    pass


def _table():
    table_name = os.environ["SCENARIOS_TABLE"]
    return boto3.resource("dynamodb").Table(table_name)


def _now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _sanitize(value: Any) -> Any:
    if isinstance(value, float):
        return Decimal(str(value))
    if isinstance(value, dict):
        return {str(key): _sanitize(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_sanitize(item) for item in value]
    return value


def _from_item(item: dict[str, Any]) -> dict[str, Any]:
    item.pop("pk", None)
    item.pop("sk", None)
    return item


def _require(body: dict[str, Any], field: str) -> Any:
    value = body.get(field)
    if value is None or (isinstance(value, str) and not value.strip()):
        raise ScenarioError(f"Missing required field: {field}")
    return value


def _user_pk(user_id: str) -> str:
    if not user_id:
        raise ScenarioError("Authenticated user id is required.")
    return f"{PK_PREFIX}{user_id}"


def create_scenario(user_id: str, body: dict[str, Any]) -> dict[str, Any]:
    scenario_id = str(uuid.uuid4())
    timestamp = _now()
    item = {
        "pk": _user_pk(user_id),
        "sk": f"{SK_PREFIX}{scenario_id}",
        "scenarioId": scenario_id,
        "userId": user_id,
        "name": str(_require(body, "name"))[:120],
        "identity": _require(body, "identity"),
        "resources": body.get("resources", []),
        "actions": body.get("actions", []),
        "deniedActions": body.get("deniedActions", []),
        "policy": body.get("policy", {}),
        "simulationResults": body.get("simulationResults", []),
        "riskAnalysis": body.get("riskAnalysis", {}),
        "createdAt": timestamp,
        "updatedAt": timestamp,
    }
    _table().put_item(Item=_sanitize(item))
    return _from_item(item)


def list_scenarios(user_id: str) -> list[dict[str, Any]]:
    response = _table().query(
        KeyConditionExpression=Key("pk").eq(_user_pk(user_id))
        & Key("sk").begins_with(SK_PREFIX)
    )
    items = [_from_item(item) for item in response.get("Items", [])]
    items.sort(key=lambda item: item.get("updatedAt", ""), reverse=True)
    return items


def get_scenario(user_id: str, scenario_id: str) -> dict[str, Any]:
    response = _table().get_item(
        Key={"pk": _user_pk(user_id), "sk": f"{SK_PREFIX}{scenario_id}"}
    )
    item = response.get("Item")
    if not item:
        raise ScenarioNotFoundError("Scenario not found.")
    return _from_item(item)


def update_scenario(user_id: str, scenario_id: str, body: dict[str, Any]) -> dict[str, Any]:
    existing = get_scenario(user_id, scenario_id)
    existing.update(
        {
            "name": str(body.get("name", existing["name"]))[:120],
            "identity": body.get("identity", existing["identity"]),
            "resources": body.get("resources", existing.get("resources", [])),
            "actions": body.get("actions", existing.get("actions", [])),
            "deniedActions": body.get("deniedActions", existing.get("deniedActions", [])),
            "policy": body.get("policy", existing.get("policy", {})),
            "simulationResults": body.get(
                "simulationResults", existing.get("simulationResults", [])
            ),
            "riskAnalysis": body.get("riskAnalysis", existing.get("riskAnalysis", {})),
            "updatedAt": _now(),
        }
    )
    item = {
        "pk": _user_pk(user_id),
        "sk": f"{SK_PREFIX}{scenario_id}",
        **existing,
        "scenarioId": scenario_id,
        "userId": user_id,
    }
    _table().put_item(Item=_sanitize(item))
    return _from_item(item)


def delete_scenario(user_id: str, scenario_id: str) -> None:
    get_scenario(user_id, scenario_id)
    _table().delete_item(Key={"pk": _user_pk(user_id), "sk": f"{SK_PREFIX}{scenario_id}"})


def dashboard_stats(user_id: str) -> dict[str, int]:
    scenarios = list_scenarios(user_id)
    simulations = 0
    allowed = 0
    denied = 0
    high_risk = 0
    for scenario in scenarios:
        results = scenario.get("simulationResults") or []
        simulations += len(results)
        for result in results:
            decision = str(result.get("decision", "")).upper()
            if decision == "ALLOWED":
                allowed += 1
            elif decision == "DENIED":
                denied += 1
        risk = scenario.get("riskAnalysis") or {}
        if str(risk.get("level", "")).upper() == "HIGH":
            high_risk += 1
    return {
        "scenarios": len(scenarios),
        "simulations": simulations,
        "allowed": allowed,
        "denied": denied,
        "highRisk": high_risk,
    }


def safe_client_error(exc: ClientError) -> str:
    return exc.response.get("Error", {}).get("Code", "DynamoDBError")
