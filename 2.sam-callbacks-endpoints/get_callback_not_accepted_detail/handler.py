import json
import logging
import math
import os
from decimal import Decimal
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

import boto3
from boto3.dynamodb.conditions import Key
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

from api_rest.http_response_factory import HttpResponseFactory
from api_rest.log import build_event_log

logger: Logger = Logger()
logger.setLevel(logging.INFO)

PR_TZ = ZoneInfo("America/Puerto_Rico")
PR_OFFSET = "-0400"
GSI_NAME = "queue_name-start_timestamp-index"


def _decimal_to_native(obj):
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def _ewt_seconds_to_minutes(val) -> Optional[int]:
    """convierte segundos a minutos redondeando para arriba."""
    if val is None:
        return None
    try:
        seconds = float(val)
        return math.ceil(seconds / 60)
    except (ValueError, TypeError):
        return None


def _get_origin_queue_name(
    queue_assoc_table,
    origin_queue_arn: Optional[str],
    cache: Dict[str, Optional[str]],
) -> Optional[str]:
    if not origin_queue_arn:
        return None
    if origin_queue_arn in cache:
        return cache[origin_queue_arn]
    try:
        resp = queue_assoc_table.get_item(Key={"queue_arn": origin_queue_arn})
        name = resp.get("Item", {}).get("queue_name")
        cache[origin_queue_arn] = name
        return name
    except Exception as e:
        logger.warning(f"error resolviendo queue_arn {origin_queue_arn}: {e}")
        cache[origin_queue_arn] = None
        return None


def _query_gsi(table, queue_name: str, start_ts: str, end_ts: str) -> List[Dict]:
    """query al GSI queue_name-start_timestamp-index."""
    kwargs = {
        "IndexName": GSI_NAME,
        "KeyConditionExpression": (
            Key("queue_name").eq(queue_name)
            & Key("start_timestamp").between(start_ts, end_ts)
        ),
    }
    resp = table.query(**kwargs)
    items = list(resp.get("Items", []))
    while "LastEvaluatedKey" in resp:
        resp = table.query(**kwargs, ExclusiveStartKey=resp["LastEvaluatedKey"])
        items.extend(resp.get("Items", []))
    return items


def _get_all_callback_queue_names(queue_config_table) -> List[str]:
    resp = queue_config_table.scan(ProjectionExpression="queue_name")
    names = [i["queue_name"] for i in resp.get("Items", []) if i.get("queue_name")]
    while "LastEvaluatedKey" in resp:
        resp = queue_config_table.scan(
            ProjectionExpression="queue_name",
            ExclusiveStartKey=resp["LastEvaluatedKey"],
        )
        names.extend(i["queue_name"] for i in resp.get("Items", []) if i.get("queue_name"))
    return names


def _build_row(item: Dict, queue_assoc_table, arn_cache: Dict) -> Dict:
    origin_arn = item.get("origin_queue_arn")
    origin_name = _get_origin_queue_name(queue_assoc_table, origin_arn, arn_cache)

    known = {
        "contact_id", "start_timestamp", "queue_name", "origin_queue_arn",
        "callback_already_offered", "selected_callback_type", "outcome",
        "active_flow", "ewt_given", "processed_at",
    }

    row: Dict[str, Any] = {
        "contact_id":              item.get("contact_id"),
        "start_timestamp":         item.get("start_timestamp"),
        "processed_at":            item.get("processed_at"),
        "callback_queue_name":     item.get("queue_name"),
        "origin_queue_arn":        origin_arn,
        "origin_queue_name":       origin_name,
        "callback_already_offered": item.get("callback_already_offered"),
        "selected_callback_type":  item.get("selected_callback_type"),
        "outcome":                 item.get("outcome"),
        "active_flow":             item.get("active_flow"),
        # ewt_given: de segundos a minutos (ceil)
        "ewt_given_minutes":       _ewt_seconds_to_minutes(item.get("ewt_given")),
    }

    # campos extra dinámicos
    for k, v in item.items():
        if k not in known:
            row[k] = v

    return row


def lambda_handler(event: Dict[str, Any], context: LambdaContext) -> Dict[str, Any]:
    """
    GET /callback-not-accepted-detail

    devuelve registros de NotAcceptedDetail para una fecha PR dada.
    los contactos son los que recibieron la oferta de callback pero no agendaron.
    ewt_given se transforma de segundos a minutos (ceil).

    query params requeridos:
      - date: YYYY-MM-DD en hora Puerto Rico

    query params opcionales:
      - callback_queue_name: filtrar por queue de callback
    """
    logger.info("Context: %s", context)
    logger.info("Event summary: %s", build_event_log(event))

    headers = {"Access-Control-Allow-Methods": "GET,OPTIONS"}

    try:
        if event.get("httpMethod") == "OPTIONS":
            return HttpResponseFactory.create(200, {}, headers)

        query_params = event.get("queryStringParameters") or {}
        date_str = query_params.get("date")
        cb_queue_filter = query_params.get("callback_queue_name")

        if not date_str:
            return HttpResponseFactory.create(
                400,
                {"error": "Bad request", "message": "date is required (YYYY-MM-DD)"},
                headers,
            )

        start_ts = f"{date_str}T00:00:00{PR_OFFSET}"
        end_ts = f"{date_str}T23:59:59{PR_OFFSET}"

        region = os.environ.get("AWS_DYNAMODB_REGION", "us-east-1")
        dynamodb = boto3.resource("dynamodb", region_name=region)

        not_accepted_table = dynamodb.Table(
            os.environ["AWS_DYNAMODB_NOT_ACCEPTED_TABLE_NAME"]
        )
        queue_assoc_table = dynamodb.Table(
            os.environ["AWS_DYNAMODB_QUEUE_ASSOCIATION_TABLE_NAME"]
        )
        queue_config_table = dynamodb.Table(
            os.environ["AWS_DYNAMODB_QUEUE_CONFIG_TABLE_NAME"]
        )

        raw_items: List[Dict] = []

        if cb_queue_filter:
            raw_items = _query_gsi(not_accepted_table, cb_queue_filter, start_ts, end_ts)
        else:
            queue_names = _get_all_callback_queue_names(queue_config_table)
            logger.info(f"iterando {len(queue_names)} queues")
            for qn in queue_names:
                raw_items.extend(_query_gsi(not_accepted_table, qn, start_ts, end_ts))

        raw_items.sort(key=lambda x: x.get("start_timestamp") or "")

        arn_cache: Dict[str, Optional[str]] = {}
        result = [_build_row(item, queue_assoc_table, arn_cache) for item in raw_items]

        body = json.loads(
            json.dumps({"items": result, "count": len(result)}, default=_decimal_to_native)
        )
        return HttpResponseFactory.create(200, body, headers)

    except Exception as e:
        import traceback
        logger.error(f"error en get_callback_not_accepted_detail: {e}")
        logger.error(traceback.format_exc())
        return HttpResponseFactory.create(
            500,
            {"error": "Internal server error", "message": "Failed to retrieve not-accepted detail."},
            headers,
        )
