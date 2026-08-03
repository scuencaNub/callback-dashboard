import logging
import os
from typing import Any, Dict, List

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
        "Access-Control-Allow-Methods": "GET,OPTIONS",
    }

    try:
        if event.get("httpMethod") == "OPTIONS":
            return HttpResponseFactory.create(200, {}, api_headers)

        identity_candidates = extract_identity_candidates(event)
        if not identity_candidates:
            return HttpResponseFactory.create(401, {"error": "Unauthorized"}, api_headers)

        table_name = os.environ.get("ANI_BLOCKED_TABLE_NAME", "")
        if not table_name:
            return HttpResponseFactory.create(
                500, {"error": "ANI_BLOCKED_TABLE_NAME not set"}, api_headers
            )

        region = os.environ.get("DYNAMODB_REGION", "")
        dynamodb_uri = os.environ.get("DYNAMODB_URI", "")
        if dynamodb_uri:
            dynamodb = boto3.resource("dynamodb", endpoint_url=dynamodb_uri, region_name=region or None)
        else:
            dynamodb = boto3.resource("dynamodb", region_name=region or None)

        table = dynamodb.Table(table_name)

        items: List[Dict[str, Any]] = []
        scan_kwargs: Dict[str, Any] = {}

        while True:
            response = table.scan(**scan_kwargs)
            for item in response.get("Items", []):
                items.append({
                    "phone_number": item.get("phone_number", ""),
                    "blocked_until": item.get("blocked_until", ""),
                    "created_at": item.get("created_at", ""),
                })

            last_evaluated_key = response.get("LastEvaluatedKey")
            if not last_evaluated_key:
                break
            scan_kwargs["ExclusiveStartKey"] = last_evaluated_key

        items.sort(key=lambda x: x.get("created_at", ""), reverse=True)

        return HttpResponseFactory.create(
            200,
            {
                "items": items,
                "count": len(items),
            },
            api_headers,
        )
    except Exception as exc:
        logger.exception("Error in get_blocked_anis: %s", exc)
        return HttpResponseFactory.create(
            500,
            {"error": "Internal server error", "message": str(exc)},
            api_headers,
        )
