"""Export generated policy JSON to Amazon S3 and return a time-limited URL."""

from __future__ import annotations

import json
import logging
import os
import uuid
from typing import Any

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from policy_validator import PolicyValidationError, validate_policy_document

logger = logging.getLogger(__name__)

PRESIGN_SECONDS = 900


class ExportError(Exception):
    pass


def export_policy(user_id: str, policy: dict[str, Any]) -> dict[str, Any]:
    if not user_id:
        raise ExportError("Authenticated user id is required.")
    document = validate_policy_document(policy)
    bucket = os.environ.get("EXPORTS_BUCKET")
    if not bucket:
        raise ExportError("Policy export storage is not configured.")

    key = f"{user_id}/{uuid.uuid4()}.json"
    body = json.dumps(document, indent=2).encode("utf-8")
    client = boto3.client("s3")
    try:
        client.put_object(
            Bucket=bucket,
            Key=key,
            Body=body,
            ContentType="application/json",
        )
        url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": key},
            ExpiresIn=PRESIGN_SECONDS,
        )
    except (ClientError, BotoCoreError) as exc:
        logger.exception("s3_export_failure")
        raise ExportError("Could not export the policy to S3.") from exc

    logger.info("s3_export_success")
    return {
        "bucket": bucket,
        "key": key,
        "url": url,
        "expiresIn": PRESIGN_SECONDS,
        "contentType": "application/json",
    }
