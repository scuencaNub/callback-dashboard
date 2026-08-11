"""
BPAC-PRD-GetNotAcceptedDetail — constructor

trigger: EventBridge Scheduler (one-time schedule, creado por
         BPAC-PRD-NotAcceptedScheduleTrigger con delay de 300s)

event payload esperado:
  {
    "contact_id":      "...",
    "queue_name":      "...",
    "start_timestamp": "..."
  }

lógica:
  1. recibe contact_id, queue_name, start_timestamp
  2. verifica si contact_id existe en CallsInSystem
  3. si SÍ existe: no hace nada (cliente agendó)
  4. si NO existe: busca el item completo en ActiveContactsInFlow
     y escribe en NotAcceptedDetail con todos los campos disponibles
     (ewt_given, origin_queue_arn, selected_callback_type, outcome, etc.)
"""

import json
import logging
import os
from datetime import datetime, timezone

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")

CALLS_IN_SYSTEM_TABLE      = os.environ["CALLS_IN_SYSTEM_TABLE"]
NOT_ACCEPTED_TABLE         = os.environ["NOT_ACCEPTED_TABLE"]
ACTIVE_CONTACTS_TABLE      = os.environ["ACTIVE_CONTACTS_TABLE"]

calls_table           = dynamodb.Table(CALLS_IN_SYSTEM_TABLE)
not_accepted_table    = dynamodb.Table(NOT_ACCEPTED_TABLE)
active_contacts_table = dynamodb.Table(ACTIVE_CONTACTS_TABLE)


def contact_exists_in_calls(contact_id: str) -> bool:
    """verifica si el contact_id existe en CallsInSystem (pk: contact_id_inbound)."""
    try:
        result = calls_table.query(
            KeyConditionExpression=Key("contact_id_inbound").eq(contact_id),
            Limit=1,
            Select="COUNT",
        )
        exists = result.get("Count", 0) > 0
        logger.info("contact_id=%s existe_en_calls=%s", contact_id, exists)
        return exists
    except ClientError as e:
        logger.error("error consultando CallsInSystem contact_id=%s: %s", contact_id, e)
        raise


def get_active_contact_item(contact_id: str) -> dict:
    """trae el item completo de ActiveContactsInFlow por contact_id (pk)."""
    try:
        resp = active_contacts_table.get_item(Key={"contact_id": contact_id})
        item = resp.get("Item", {})
        if not item:
            logger.warning("contact_id=%s no encontrado en ActiveContactsInFlow", contact_id)
        return item
    except ClientError as e:
        logger.error("error leyendo ActiveContactsInFlow contact_id=%s: %s", contact_id, e)
        raise


def write_not_accepted(contact_id: str, queue_name: str, start_timestamp: str, active_item: dict) -> None:
    """escribe en NotAcceptedDetail con todos los campos disponibles."""
    processed_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    item: dict = {
        "contact_id":      contact_id,
        "queue_name":      active_item.get("queue_name") or queue_name,
        "start_timestamp": active_item.get("start_timestamp") or start_timestamp,
        "processed_at":    processed_at,
    }

    extra_fields = [
        "callback_already_offered",
        "selected_callback_type",
        "outcome",
        "active_flow",
        "ewt_given",
        "origin_queue_arn",
    ]
    for field in extra_fields:
        if field in active_item:
            item[field] = active_item[field]

    # campos dinámicos extra
    reserved = {"contact_id", "queue_name", "start_timestamp", "processed_at"} | set(extra_fields)
    for k, v in active_item.items():
        if k not in reserved:
            item[k] = v

    try:
        not_accepted_table.put_item(Item=item)
        logger.info(
            "not_accepted registrado: contact_id=%s queue=%s ewt_given=%s origin_queue_arn=%s",
            contact_id,
            item.get("queue_name"),
            item.get("ewt_given"),
            item.get("origin_queue_arn"),
        )
    except ClientError as e:
        logger.error("error escribiendo NotAcceptedDetail contact_id=%s: %s", contact_id, e)
        raise


def lambda_handler(event: dict, context) -> dict:
    logger.info("event recibido: %s", json.dumps(event, default=str))

    contact_id      = event.get("contact_id")
    queue_name      = event.get("queue_name", "UNKNOWN")
    start_timestamp = event.get("start_timestamp", "")

    if not contact_id:
        logger.warning("evento sin contact_id, ignorando: %s", event)
        return {"statusCode": 400, "error": "missing contact_id"}

    if contact_exists_in_calls(contact_id):
        logger.info(
            "contact_id=%s encontrado en CallsInSystem — cliente agendó, no escribir",
            contact_id,
        )
        return {"statusCode": 200, "action": "skipped_registered", "contact_id": contact_id}

    active_item = get_active_contact_item(contact_id)
    write_not_accepted(contact_id, queue_name, start_timestamp, active_item)

    return {"statusCode": 200, "action": "not_accepted_written", "contact_id": contact_id}
