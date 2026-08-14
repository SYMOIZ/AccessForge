"""Verified AWS action catalog for the AccessForge playground."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

CATALOG_PATH = Path(__file__).with_name("catalog.json")


@lru_cache(maxsize=1)
def load_catalog() -> dict[str, Any]:
    with CATALOG_PATH.open(encoding="utf-8") as handle:
        return json.load(handle)


def all_actions() -> set[str]:
    actions: set[str] = set()
    for resource in load_catalog()["resources"]:
        for item in resource["actions"]:
            actions.add(item["action"])
    return actions


def action_service_map() -> dict[str, str]:
    mapping: dict[str, str] = {}
    for resource in load_catalog()["resources"]:
        for item in resource["actions"]:
            mapping[item["action"]] = resource["id"]
    return mapping


def is_known_action(action: str) -> bool:
    if action in all_actions():
        return True
    if action == "*":
        return True
    if action.endswith(":*") and action.count(":") == 1:
        prefix = action[:-1]
        return any(known.startswith(prefix) for known in all_actions())
    return False


def identities() -> list[dict[str, Any]]:
    return list(load_catalog()["identities"])


def resources() -> list[dict[str, Any]]:
    return list(load_catalog()["resources"])
