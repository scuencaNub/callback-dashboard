import json
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any, Dict

import boto3
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

from api_rest.editor_authorization import extract_identity_candidates
from api_rest.http_response_factory import HttpResponseFactory
from api_rest.log import build_event_log

logger: Logger = Logger()
logger.setLevel(logging.INFO)

PHONE_REGEX = re.compile(r"^\+1\d{10}$")


def validate_phone_number(phone: str) -> bool:
    """Validate phone number format: +1 followed by 10 digits (US/Puerto Rico)."""
    return bool(PHONE_REGEX.match(phone))


def validate_blocked_until(blocked_until: str) -> bool:
    """Validate that blocked_until is a valid ISO date in the future."""
    try:
        dt = datetime.fromisoformat(blocked_until.replace("Z", "+00:00"))
        return dt > datetime.now(timezone.utc)
    except (ValueError, TypeError):
        return False


def lambda_handler(event: Dict[str, Any], context: LambdaContext) -> Dict[str, Any]:
    logger.info("Context: %s", context)
    logger.info("Event summary: %s", build_event_log(event))

    api_headers = {
        "Access-Control-Allow-Methods": "POST,OPTIONS",
    }

    try:
        if event.get("httpMethod") == "OPTIONS":
            return HttpResponseFactory.create(200, {}, api_headers)

        identity_candidates = extract_identity_candidates(event)
        if not identity_candidates:
            return HttpResponseFactory.create(401, {"error": "Unauthorized"}, api_headers)

        # Parse body
        body = event.get("body")
        if not body:
            return HttpResponseFactory.create(400, {"error": "Request body is required"}, api_headers)

        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            return HttpResponseFactory.create(400, {"error": "Invalid JSON body"}, api_headers)

        phone_number = data.get("phone_number", "").strip()
        blocked_until = data.get("blocked_until", "").strip()

        # Validations
        if not phone_number:
            return HttpResponseFactory.create(400, {"error": "phone_number is required"}, api_headers)

        if not validate_phone_number(phone_number):
            return HttpResponseFactory.create(
                400,
                {"error": "Invalid phone_number format. Expected: +1XXXXXXXXXX"},
                api_headers,
            )

        if not blocked_until:
            return HttpResponseFactory.create(400, {"error": "blocked_until is required"}, api_headers)

        if not validate_blocked_until(blocked_until):
            return HttpResponseFactory.create(
                400,
                {"error": "blocked_until must be a valid ISO date in the future"},
                api_headers,
            )

        # DynamoDB
        table_name = os.environ.get("ANI_BLOCKED_TABLE_NAME", "")
        if not table_name:
            return HttpResponseFactory.create(500, {"error": "ANI_BLOCKED_TABLE_NAME not set"}, api_headers)

        region = os.environ.get("DYNAMODB_REGION", "")
        dynamodb_uri = os.environ.get("DYNAMODB_URI", "")
        if dynamodb_uri:
            dynamodb = boto3.resource("dynamodb", endpoint_url=dynamodb_uri, region_name=region or None)
        else:
            dynamodb = boto3.resource("dynamodb", region_name=region or None)

        table = dynamodb.Table(table_name)

        # Check if already exists
        existing = table.get_item(Key={"phone_number": phone_number})
        if "Item" in existing:
            return HttpResponseFactory.create(
                409,
                {"error": f"Phone number {phone_number} is already blocked"},
                api_headers,
            )

        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        item = {
            "phone_number": phone_number,
            "blocked_until": blocked_until,
            "created_at": now,
        }

        table.put_item(Item=item)

        return HttpResponseFactory.create(201, {"message": "ANI blocked successfully", "item": item}, api_headers)

    except Exception as exc:
        logger.exception("Error in create_blocked_ani: %s", exc)
        return HttpResponseFactory.create(
            500,
            {"error": "Internal server error", "message": str(exc)},
            api_headers,
        )
