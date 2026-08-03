#
# Bulk update CallsInSystem records by explicit keys (contact_id_inbound + call_at).
#

import json
import logging
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Optional, Tuple

from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext
from boto3.dynamodb.types import TypeSerializer

from api_rest.editor_authorization import require_editor_role
from api_rest.http_response_factory import HttpResponseFactory
from api_rest.log import build_event_log
from client.dynamo_db_client import DynamoDbClient

logger: Logger = Logger()
logger.setLevel(logging.INFO)

_serializer = TypeSerializer()


def _get_env(name: str, default: str = "") -> str:
    value = os.environ.get(name, default)
    return value if value else default


def _parse_body(event: Dict[str, Any]) -> Dict[str, Any]:
    try:
        if isinstance(event.get("body"), str):
            return json.loads(event.get("body", "{}"))
        return event.get("body", {}) or {}
    except json.JSONDecodeError:
        raise ValueError("Invalid JSON in request body")


def _serialize_item(item: Dict[str, Any]) -> Dict[str, Any]:
    return {k: _serializer.serialize(v) for k, v in item.items()}


def _validate(body: Dict[str, Any]) -> Tuple[List[Dict[str, str]], Dict[str, Any], int]:
    """
    Expected body:
    {
      "items": [{"contact_id_inbound": "...", "call_at": "YYYY-MM-DD HH:mm"}, ...],  # required, max 500
      "update_fields": { "status": "...", "queue_name": "...", "queue_id": "...", "call_at": "..." }, # required
      "max_concurrency": 20  # optional (default 20, max 25)
    }
    """
    if not body:
        raise ValueError("Request body is required")

    items = body.get("items")
    update_fields = body.get("update_fields")
    max_concurrency = body.get("max_concurrency", 20)

    if not isinstance(items, list) or not items:
        raise ValueError("'items' is required and must be a non-empty list")
    if len(items) > 500:
        raise ValueError("'items' max is 500")

    normalized_items: List[Dict[str, str]] = []
    for it in items:
        if not isinstance(it, dict):
            raise ValueError("Each item in 'items' must be an object")
        cid = it.get("contact_id_inbound")
        call_at = it.get("call_at")
        if not cid or not call_at:
            raise ValueError("Each item must include 'contact_id_inbound' and 'call_at'")
        normalized_items.append({"contact_id_inbound": str(cid), "call_at": str(call_at)})

    if not isinstance(update_fields, dict) or not update_fields:
        raise ValueError("'update_fields' is required and must be an object")

    # allow only known fields (keep this strict)
    allowed_fields = {
        "status",
        "queue_name",
        "queue_id",
        "callback_type",
        "agent_id",
        "agent_name",
        "contact_id_outbound",
        "outbound_phone_number",
        "retry_attempt_interval",
        "retries",
        "contact_flow_id",
        "call_at",  # special: changes sort key, we will MOVE the item
    }
    cleaned_update_fields: Dict[str, Any] = {k: v for k, v in update_fields.items() if k in allowed_fields}
    if not cleaned_update_fields:
        raise ValueError("No valid fields in 'update_fields'")

    try:
        max_concurrency_int = int(max_concurrency)
    except Exception:
        raise ValueError("'max_concurrency' must be an integer")
    if max_concurrency_int <= 0:
        raise ValueError("'max_concurrency' must be greater than 0")
    if max_concurrency_int > 25:
        max_concurrency_int = 25

    return normalized_items, cleaned_update_fields, max_concurrency_int


def _update_in_place(table, key: Dict[str, str], update_fields: Dict[str, Any]) -> None:
    """
    Update item in place using UpdateItem (cannot change call_at).
    """
    update_expressions: List[str] = []
    ean: Dict[str, str] = {}
    eav: Dict[str, Any] = {}

    for field, value in update_fields.items():
        if field == "call_at":
            continue
        name_ph = f"#{field}"
        value_ph = f":{field}"
        ean[name_ph] = field
        eav[value_ph] = value
        update_expressions.append(f"{name_ph} = {value_ph}")

    if not update_expressions:
        # nothing to do
        return

    table.update_item(
        Key=key,
        UpdateExpression="SET " + ", ".join(update_expressions),
        ExpressionAttributeNames=ean,
        ExpressionAttributeValues=eav,
        ConditionExpression="attribute_exists(contact_id_inbound) AND attribute_exists(call_at)",
    )


def _move_item(table, key: Dict[str, str], new_call_at: str, update_fields: Dict[str, Any]) -> None:
    """
    Change sort key call_at by: Get old item -> TransactWrite(Put new, Delete old).
    """
    old = table.get_item(Key=key).get("Item")
    if not old:
        raise ValueError("Item not found")

    # Create new item copying old attributes and applying updates
    new_item = dict(old)
    # Apply other updates
    for field, value in update_fields.items():
        if field == "call_at":
            continue
        new_item[field] = value
    new_item["call_at"] = new_call_at

    # call_at is part of the primary key, so we must "move" the item.
    # 1) Put new item (guard: target key doesn't exist)
    # 2) Delete old item (guard: old key exists)
    from botocore.exceptions import ClientError
    try:
        table.put_item(
            Item=new_item,
            ConditionExpression="attribute_not_exists(contact_id_inbound) AND attribute_not_exists(call_at)",
        )
    except ClientError as e:
        if e.response.get("Error", {}).get("Code") == "ConditionalCheckFailedException":
            raise ValueError("Target call_at already exists for this contact_id_inbound") from e
        raise

    try:
        table.delete_item(
            Key=key,
            ConditionExpression="attribute_exists(contact_id_inbound) AND attribute_exists(call_at)",
        )
    except ClientError as e:
        # Roll back best-effort: try to delete the new item we just inserted
        try:
            table.delete_item(
                Key={"contact_id_inbound": key["contact_id_inbound"], "call_at": new_call_at},
            )
        except Exception:
            pass
        raise


def _process_one(table, item_key: Dict[str, str], update_fields: Dict[str, Any]) -> Tuple[bool, str, Optional[str]]:
    """
    Returns: (success, contact_id_inbound, error_message?)
    """
    try:
        new_call_at = update_fields.get("call_at")
        if isinstance(new_call_at, str) and new_call_at and new_call_at != item_key["call_at"]:
            _move_item(table, item_key, new_call_at, update_fields)
        else:
            _update_in_place(table, item_key, update_fields)
        return True, item_key["contact_id_inbound"], None
    except Exception as e:
        return False, item_key["contact_id_inbound"], str(e)


def lambda_handler(event: Dict[str, Any], context: LambdaContext) -> Dict[str, Any]:
    """
    Bulk update CallsInSystem records by explicit keys.

    HTTP Method: POST
    Path: /calls-in-system/bulk-update-by-keys
    """
    logger.info("Context: %s", context)
    logger.info("Event summary: %s", build_event_log(event))

    headers = {
        "Access-Control-Allow-Methods": "POST,OPTIONS",
    }

    try:
        if "OPTIONS" == event.get("httpMethod"):
            return HttpResponseFactory.create(200, {}, headers)

        require_editor_role(event)

        body_raw = _parse_body(event)
        items, update_fields, max_concurrency = _validate(body_raw)

        dynamoDbClient = DynamoDbClient.create(
            _get_env("DYNAMODB_REGION"),
            _get_env("DYNAMODB_URI"),
        )

        table_name = _get_env("DYNAMODB_TABLE_NAME")
        if not table_name:
            raise RuntimeError("DYNAMODB_TABLE_NAME environment variable is not set")

        table = dynamoDbClient.Table(table_name)

        processed = 0
        failed = 0
        errors: List[Dict[str, Any]] = []

        logger.info("Bulk edition: items=%d max_concurrency=%d update_fields=%s", len(items), max_concurrency, update_fields)

        with ThreadPoolExecutor(max_workers=max_concurrency) as executor:
            futures = [executor.submit(_process_one, table, k, update_fields) for k in items]
            for f in as_completed(futures):
                success, contact_id_inbound, error = f.result()
                if success:
                    processed += 1
                else:
                    failed += 1
                    errors.append({"contact_id_inbound": contact_id_inbound, "error": error})

        response_body: Dict[str, Any] = {
            "summary": {
                "matched": len(items),
                "processed": processed,
                "failed": failed,
            },
            "update_fields": update_fields,
        }

        if errors:
            response_body["errors"] = errors[:20]

        return HttpResponseFactory.create(200, response_body, headers)

    except PermissionError:
        return HttpResponseFactory.create(
            403,
            {"error": "Forbidden", "message": "Editor role required to bulk update calls in system."},
            headers,
        )
    except ValueError as e:
        return HttpResponseFactory.create(
            400,
            {"error": "Bad Request", "message": str(e)},
            headers,
        )
    except Exception as e:
        logger.error('Error in `bulk_update_calls_in_system_by_keys`: "%s".', str(e))
        return HttpResponseFactory.create(
            500,
            {"error": "Internal server error", "message": "Failed to bulk update calls in system."},
            headers,
        )


