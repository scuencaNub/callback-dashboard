import logging
import os
from typing import Any, Dict, List

import boto3
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext
from boto3.dynamodb.conditions import Key

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

        table_name = os.environ.get("REPORTS_TABLE_NAME", "")
        if not table_name:
            return HttpResponseFactory.create(500, {"error": "REPORTS_TABLE_NAME not set"}, api_headers)

        region = os.environ.get("DYNAMODB_REGION", "")
        dynamodb_uri = os.environ.get("DYNAMODB_URI", "")
        if dynamodb_uri:
            dynamodb = boto3.resource("dynamodb", endpoint_url=dynamodb_uri, region_name=region or None)
        else:
            dynamodb = boto3.resource("dynamodb", region_name=region or None)

        table = dynamodb.Table(table_name)

        items: List[Dict[str, Any]] = []
        seen_report_ids = set()

        for identity in identity_candidates:
            query_kwargs: Dict[str, Any] = {
                "IndexName": "CreatedByCreatedAtIndex",
                "KeyConditionExpression": Key("createdByNormalized").eq(identity),
            }

            while True:
                response = table.query(**query_kwargs)
                for item in response.get("Items", []):
                    report_id = str(item.get("reportId", ""))
                    if report_id and report_id not in seen_report_ids:
                        seen_report_ids.add(report_id)
                        items.append(item)

                last_evaluated_key = response.get("LastEvaluatedKey")
                if not last_evaluated_key:
                    break
                query_kwargs["ExclusiveStartKey"] = last_evaluated_key

        items.sort(key=lambda item: str(item.get("createdAt", "")), reverse=True)

        result = []
        for item in items:
            result.append(
                {
                    "reportId": item.get("reportId"),
                    "type": item.get("type"),
                    "status": item.get("status"),
                    "createdAt": item.get("createdAt"),
                    "finishedAt": item.get("finishedAt"),
                    "resultLocation": item.get("resultLocation"),
                    "totalRowCount": item.get("totalRowCount"),
                    "params": item.get("params"),
                }
            )

        return HttpResponseFactory.create(
            200,
            {
                "items": result,
                "count": len(result),
            },
            api_headers,
        )
    except Exception as exc:
        logger.exception("Error in get_reports: %s", exc)
        return HttpResponseFactory.create(
            500,
            {"error": "Internal server error", "message": str(exc)},
            api_headers,
        )
