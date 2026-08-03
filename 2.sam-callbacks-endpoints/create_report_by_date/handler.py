import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict

import boto3
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

from api_rest.http_response_factory import HttpResponseFactory
from api_rest.log import build_event_log


logger: Logger = Logger()
logger.setLevel(logging.INFO)
MAX_RANGE_MONTHS = 4


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_identity(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip().lower()


def parse_input_datetime(value: Any) -> datetime:
    raw = str(value or "").strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(raw, fmt)
        except ValueError:
            continue
    raise ValueError(f"Invalid datetime format: {value!r}")


def add_months(value: datetime, months: int) -> datetime:
    year = value.year + (value.month - 1 + months) // 12
    month = (value.month - 1 + months) % 12 + 1
    month_days = [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    day = min(value.day, month_days[month - 1])
    return value.replace(year=year, month=month, day=day)


def lambda_handler(event: Dict[str, Any], context: LambdaContext) -> Dict[str, Any]:
    logger.info("Context: %s", context)
    logger.info("Event summary: %s", build_event_log(event))

    headers = {
        "Access-Control-Allow-Methods": "POST,OPTIONS",
    }

    try:
        if event.get("httpMethod") == "OPTIONS":
            return HttpResponseFactory.create(200, {}, headers)

        body_str = event.get("body", "{}")
        try:
            body = json.loads(body_str) if isinstance(body_str, str) else body_str
        except (json.JSONDecodeError, TypeError):
            return HttpResponseFactory.create(
                400,
                {"error": "Invalid JSON in request body"},
                headers,
            )

        start_date = body.get("start_date")
        end_date = body.get("end_date")
        phone_numbers = body.get("phone_numbers", [])

        if not start_date or not end_date:
            return HttpResponseFactory.create(
                400,
                {"error": "start_date and end_date are required"},
                headers,
            )
        try:
            start_dt = parse_input_datetime(start_date)
            end_dt = parse_input_datetime(end_date)
        except ValueError:
            return HttpResponseFactory.create(
                400,
                {
                    "error": "Invalid date format. Use YYYY-MM-DD HH:MM:SS",
                },
                headers,
            )

        if end_dt < start_dt:
            return HttpResponseFactory.create(
                400,
                {"error": "Invalid date range. end_date must be greater than start_date"},
                headers,
            )

        max_end_dt = add_months(start_dt, MAX_RANGE_MONTHS)
        if end_dt > max_end_dt:
            return HttpResponseFactory.create(
                400,
                {"error": "Date range exceeded. Maximum allowed range is 4 months"},
                headers,
            )

        reports_table_name = os.environ.get("REPORTS_TABLE_NAME", "")
        if not reports_table_name:
            raise ValueError("REPORTS_TABLE_NAME environment variable is required")

        queue_url = os.environ.get("REPORTS_QUEUE_URL", "")
        if not queue_url:
            raise ValueError("REPORTS_QUEUE_URL environment variable is required")

        region = os.environ.get("DYNAMODB_REGION", "")
        dynamodb_uri = os.environ.get("DYNAMODB_URI", "")

        if dynamodb_uri:
            dynamodb = boto3.resource("dynamodb", endpoint_url=dynamodb_uri, region_name=region or None)
        else:
            dynamodb = boto3.resource("dynamodb", region_name=region or None)

        table = dynamodb.Table(reports_table_name)

        report_id = str(uuid.uuid4())

        request_context = event.get("requestContext", {}) or {}
        authorizer = request_context.get("authorizer", {}) or {}
        claims = authorizer.get("claims", {}) or {}
        created_by = claims.get("email") or claims.get("cognito:username") or ""
        normalized_created_by = normalize_identity(created_by)

        item: Dict[str, Any] = {
            "reportId": report_id,
            "type": "CALLBACKS_BY_DATE",
            "status": "PENDING",
            "createdAt": now_iso(),
            "createdBy": normalized_created_by,
            "createdByNormalized": normalized_created_by,
            "params": {
                "start_date": start_date,
                "end_date": end_date,
                "phone_numbers": phone_numbers,
            },
        }

        table.put_item(Item=item)

        sqs = boto3.client("sqs")
        sqs.send_message(
            QueueUrl=queue_url,
            MessageBody=json.dumps(
                {
                    "reportId": report_id,
                    "type": "CALLBACKS_BY_DATE",
                }
            ),
        )

        return HttpResponseFactory.create(
            200,
            {
                "reportId": report_id,
                "status": "PENDING",
            },
            headers,
        )

    except Exception as exc:
        logger.exception("Error while creating report-by-date job: %s", exc)
        return HttpResponseFactory.create(
            500,
            {
                "error": "Internal server error",
                "message": "Failed to create report-by-date job",
            },
            headers,
        )

