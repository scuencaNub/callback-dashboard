import csv
import io
import json
import logging
import os
from typing import Any, Dict, List, Tuple

import boto3
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

from api_rest.editor_authorization import extract_identity_candidates, normalize_identity
from api_rest.http_response_factory import HttpResponseFactory
from api_rest.log import build_event_log

logger: Logger = Logger()
logger.setLevel(logging.INFO)

s3_client = boto3.client("s3", region_name=os.getenv("AWS_REGION", "us-east-1"))


def parse_s3_location(result_location: str) -> Tuple[str, str]:
    """Parse s3://bucket/key into (bucket, key)."""
    if not result_location.startswith("s3://"):
        raise ValueError("resultLocation must be s3://bucket/key")
    parts = result_location[5:].strip("/").split("/", 1)
    bucket = parts[0]
    key = parts[1] if len(parts) > 1 else ""
    return bucket, key


def stream_csv_page(bucket: str, key: str, page: int, page_size: int) -> Tuple[List[str], List[Dict[str, Any]]]:
    """
    Stream CSV from S3, skip to page, return headers and that page of rows only.
    Does not load the full file into memory.
    """
    response = s3_client.get_object(Bucket=bucket, Key=key)
    body = response["Body"]

    headers: List[str] = []
    rows: List[Dict[str, Any]] = []
    skip = (page - 1) * page_size
    take = page_size
    skipped = 0
    taken = 0

    for raw_line in body.iter_lines():
        line = raw_line.decode("utf-8")
        if not headers:
            reader = csv.reader(io.StringIO(line))
            headers = next(reader)
            continue
        if skipped < skip:
            skipped += 1
            continue
        if taken >= take:
            break
        reader = csv.reader(io.StringIO(line))
        values = next(reader)
        if len(values) >= len(headers):
            row = dict(zip(headers, values[: len(headers)]))
            if len(values) > len(headers):
                row[headers[-1]] = ",".join(values[len(headers) :])
            rows.append(row)
            taken += 1

    return headers, rows


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

        path_params = event.get("pathParameters") or {}
        report_id = path_params.get("reportId")
        if not report_id:
            return HttpResponseFactory.create(400, {"error": "reportId is required"}, api_headers)

        query = event.get("queryStringParameters") or {}
        try:
            page = max(1, int(query.get("page", 1)))
            page_size = max(1, min(500, int(query.get("pageSize", 50))))
        except (TypeError, ValueError):
            page = 1
            page_size = 50

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
        _, rows = stream_csv_page(bucket, key, page, page_size)

        total_rows = item.get("totalRowCount")
        if total_rows is not None:
            total_rows = int(total_rows)

        return HttpResponseFactory.create(
            200,
            {
                "rows": rows,
                "page": page,
                "pageSize": page_size,
                "totalRows": total_rows,
            },
            api_headers,
        )

    except ValueError as e:
        logger.warning("ValueError: %s", e)
        return HttpResponseFactory.create(400, {"error": str(e)}, api_headers)
    except Exception as exc:
        logger.exception("Error in get_report_rows: %s", exc)
        return HttpResponseFactory.create(
            500,
            {"error": "Internal server error", "message": str(exc)},
            api_headers,
        )
