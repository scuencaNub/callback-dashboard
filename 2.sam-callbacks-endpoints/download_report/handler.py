import logging
import os
from typing import Any, Dict, List

import boto3
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

from api_rest.editor_authorization import extract_identity_candidates, normalize_identity
from api_rest.http_response_factory import HttpResponseFactory
from api_rest.log import build_event_log

logger: Logger = Logger()
logger.setLevel(logging.INFO)


def parse_s3_location(result_location: str) -> tuple[str, str]:
    if not result_location.startswith("s3://"):
        raise ValueError("resultLocation must be s3://bucket/key")
    parts = result_location[5:].strip("/").split("/", 1)
    bucket = parts[0]
    key = parts[1] if len(parts) > 1 else ""
    return bucket, key


def lambda_handler(event: Dict[str, Any], context: LambdaContext) -> Dict[str, Any]:
    logger.info("Context: %s", context)
    logger.info("Event summary: %s", build_event_log(event))

    api_headers = {
        "Access-Control-Allow-Methods": "GET,OPTIONS",
    }

    try:
        if event.get("httpMethod") == "OPTIONS":
            return HttpResponseFactory.create(200, {}, api_headers)

        identity_candidates: List[str] = extract_identity_candidates(event)
        if not identity_candidates:
            return HttpResponseFactory.create(401, {"error": "Unauthorized"}, api_headers)

        path_params = event.get("pathParameters") or {}
        report_id = path_params.get("reportId")
        if not report_id:
            return HttpResponseFactory.create(400, {"error": "reportId is required"}, api_headers)

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
        resp = table.get_item(Key={"reportId": report_id})
        item = resp.get("Item")
        if not item:
            return HttpResponseFactory.create(404, {"error": "Report not found"}, api_headers)

        owner = normalize_identity(item.get("createdBy"))
        if not owner or owner not in identity_candidates:
            return HttpResponseFactory.create(403, {"error": "Forbidden"}, api_headers)

        status = item.get("status")
        if status != "SUCCEEDED":
            return HttpResponseFactory.create(
                400,
                {"error": "Report not ready", "status": status},
                api_headers,
            )

        result_location = item.get("resultLocation")
        if not result_location:
            return HttpResponseFactory.create(
                400,
                {"error": "Report has no result location"},
                api_headers,
            )

        bucket, key = parse_s3_location(result_location)

        s3_client = boto3.client("s3", region_name=os.getenv("AWS_REGION", "us-east-1"))
        presigned_url = s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": key},
            ExpiresIn=3600,
        )

        return HttpResponseFactory.create(
            200,
            {"url": presigned_url},
            api_headers,
        )

    except Exception as exc:
        logger.exception("Error in download_report: %s", exc)
        return HttpResponseFactory.create(
            500,
            {"error": "Internal server error", "message": str(exc)},
            api_headers,
        )

