import json
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any, Dict
from urllib.parse import unquote

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
        "Access-Control-Allow-Methods": "PUT,DELETE,OPTIONS",
    }

    try:
        if event.get("httpMethod") == "OPTIONS":
            return HttpResponseFactory.create(200, {}, api_headers)

        identity_candidates = extract_identity_candidates(event)
        if not identity_candidates:
            return HttpResponseFactory.create(401, {"error": "Unauthorized"}, api_headers)

        # Get the phone_number from path parameters
        path_parameters = event.get("pathParameters") or {}
        current_phone = unquote(path_parameters.get("phone_number", "")).strip()

        if not current_phone:
            return HttpResponseFactory.create(
                400, {"error": "phone_number path parameter is required"}, api_headers
            )

        # Parse body
        body = event.get("body")
        if not body:
            return HttpResponseFactory.create(400, {"error": "Request body is required"}, api_headers)

        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            return HttpResponseFactory.create(400, {"error": "Invalid JSON body"}, api_headers)

        new_phone_number = data.get("phone_number", "").strip()
        blocked_until = data.get("blocked_until", "").strip()

        # At least one field must be provided
        if not new_phone_number and not blocked_until:
            return HttpResponseFactory.create(
                400,
                {"error": "At least one of phone_number or blocked_until must be provided"},
                api_headers,
            )

        # Validate new phone number if provided
        if new_phone_number and not validate_phone_number(new_phone_number):
            return HttpResponseFactory.create(
                400,
                {"error": "Invalid phone_number format. Expected: +1XXXXXXXXXX"},
                api_headers,
            )

        # Validate blocked_until if provided
        if blocked_until and not validate_blocked_until(blocked_until):
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

        # Verify the current item exists
        existing = table.get_item(Key={"phone_number": current_phone})
        if "Item" not in existing:
            return HttpResponseFactory.create(
                404,
                {"error": f"Phone number {current_phone} not found"},
                api_headers,
            )

        existing_item = existing["Item"]

        # If phone number is changing, we need to delete old and create new
        if new_phone_number and new_phone_number != current_phone:
            # Check if new phone number already exists
            conflict = table.get_item(Key={"phone_number": new_phone_number})
            if "Item" in conflict:
                return HttpResponseFactory.create(
                    409,
                    {"error": f"Phone number {new_phone_number} is already blocked"},
                    api_headers,
                )

            # Delete old record
            table.delete_item(Key={"phone_number": current_phone})

            # Create new record with updated values
            updated_item = {
                "phone_number": new_phone_number,
                "blocked_until": blocked_until if blocked_until else existing_item.get("blocked_until", ""),
                "created_at": existing_item.get("created_at", ""),
            }
            table.put_item(Item=updated_item)
        else:
            # Only updating blocked_until
            update_expressions = []
            expression_values = {}

            if blocked_until:
                update_expressions.append("blocked_until = :bu")
                expression_values[":bu"] = blocked_until

            if update_expressions:
                table.update_item(
                    Key={"phone_number": current_phone},
                    UpdateExpression="SET " + ", ".join(update_expressions),
                    ExpressionAttributeValues=expression_values,
                )

            updated_item = {
                "phone_number": current_phone,
                "blocked_until": blocked_until if blocked_until else existing_item.get("blocked_until", ""),
                "created_at": existing_item.get("created_at", ""),
            }

        return HttpResponseFactory.create(
            200, {"message": "ANI updated successfully", "item": updated_item}, api_headers
        )

    except Exception as exc:
        logger.exception("Error in update_blocked_ani: %s", exc)
        return HttpResponseFactory.create(
            500,
            {"error": "Internal server error", "message": str(exc)},
            api_headers,
        )
