import logging
import os
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
        phone_number = unquote(path_parameters.get("phone_number", "")).strip()

        if not phone_number:
            return HttpResponseFactory.create(
                400, {"error": "phone_number path parameter is required"}, api_headers
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

        # Verify the item exists
        existing = table.get_item(Key={"phone_number": phone_number})
        if "Item" not in existing:
            return HttpResponseFactory.create(
                404,
                {"error": f"Phone number {phone_number} not found"},
                api_headers,
            )

        # Delete the item
        table.delete_item(Key={"phone_number": phone_number})

        return HttpResponseFactory.create(
            200,
            {"message": f"Phone number {phone_number} unblocked successfully"},
            api_headers,
        )

    except Exception as exc:
        logger.exception("Error in delete_blocked_ani: %s", exc)
        return HttpResponseFactory.create(
            500,
            {"error": "Internal server error", "message": str(exc)},
            api_headers,
        )
