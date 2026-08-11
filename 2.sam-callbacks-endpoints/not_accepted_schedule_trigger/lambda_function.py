"""
BPAC-PRD-NotAcceptedScheduleTrigger

trigger: DynamoDB Stream de ActiveContactsInFlow
         filtro: callback_already_offered = true

lógica:
  por cada evento del stream, crea un schedule one-time en EventBridge
  Scheduler con delay de DELAY_SECONDS, apuntando a la lambda de negocio
  BPAC-PRD-GetNotAcceptedDetail. el schedule se autoelimina después de
  ejecutarse (ActionAfterCompletion=DELETE).

  esto reemplaza el mecanismo de MaximumBatchingWindowInSeconds, que no
  funciona como delay real cuando BatchSize=1.
"""

import json
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

scheduler_client = boto3.client("scheduler")

TARGET_LAMBDA_ARN   = os.environ["TARGET_LAMBDA_ARN"]
SCHEDULER_ROLE_ARN   = os.environ["SCHEDULER_ROLE_ARN"]
DELAY_SECONDS        = int(os.environ.get("DELAY_SECONDS", "300"))
SCHEDULE_GROUP_NAME  = os.environ.get("SCHEDULE_GROUP_NAME", "default")


def deserialize_dynamo_value(dynamo_val: dict):
    if "S" in dynamo_val:
        return dynamo_val["S"]
    if "BOOL" in dynamo_val:
        return dynamo_val["BOOL"]
    if "N" in dynamo_val:
        return dynamo_val["N"]
    if "NULL" in dynamo_val:
        return None
    return str(dynamo_val)


def create_delayed_schedule(contact_id: str, queue_name: str, start_timestamp: str) -> None:
    """crea un schedule one-time que invoca GetNotAcceptedDetail en DELAY_SECONDS."""

    run_at = datetime.now(timezone.utc) + timedelta(seconds=DELAY_SECONDS)
    schedule_expression = f"at({run_at.strftime('%Y-%m-%dT%H:%M:%S')})"

    schedule_name = f"not-accepted-{contact_id[:8]}-{uuid.uuid4().hex[:8]}"

    payload = {
        "contact_id": contact_id,
        "queue_name": queue_name,
        "start_timestamp": start_timestamp,
    }

    try:
        scheduler_client.create_schedule(
            Name=schedule_name,
            GroupName=SCHEDULE_GROUP_NAME,
            ScheduleExpression=schedule_expression,
            ScheduleExpressionTimezone="UTC",
            FlexibleTimeWindow={"Mode": "OFF"},
            ActionAfterCompletion="DELETE",
            Target={
                "Arn": TARGET_LAMBDA_ARN,
                "RoleArn": SCHEDULER_ROLE_ARN,
                "Input": json.dumps(payload),
            },
        )
        logger.info(
            "schedule creado: name=%s contact_id=%s run_at=%s",
            schedule_name, contact_id, schedule_expression
        )
    except ClientError as e:
        logger.error("error creando schedule para contact_id=%s: %s", contact_id, e)
        raise


def process_record(record: dict) -> None:
    event_name = record.get("eventName")
    new_image = record.get("dynamodb", {}).get("NewImage", {})

    if not new_image:
        logger.warning("record sin NewImage, ignorando. eventName=%s", event_name)
        return

    contact_id      = deserialize_dynamo_value(new_image.get("contact_id", {}))
    queue_name      = deserialize_dynamo_value(new_image.get("queue_name", {}))
    start_timestamp = deserialize_dynamo_value(new_image.get("start_timestamp", {}))
    offered         = deserialize_dynamo_value(new_image.get("callback_already_offered", {"BOOL": False}))

    logger.info(
        "record recibido: contact_id=%s queue=%s offered=%s event=%s",
        contact_id, queue_name, offered, event_name
    )

    if not offered:
        logger.info("callback_already_offered=false, ignorando contact_id=%s", contact_id)
        return

    if not contact_id:
        logger.warning("contact_id vacío, ignorando record")
        return

    create_delayed_schedule(contact_id, queue_name or "UNKNOWN", start_timestamp or "")


def lambda_handler(event: dict, context) -> dict:
    logger.info("records recibidos: %d", len(event.get("Records", [])))

    errors = []
    for i, record in enumerate(event.get("Records", [])):
        try:
            process_record(record)
        except Exception as e:
            logger.error("error en record %d: %s", i, e, exc_info=True)
            errors.append({"record_index": i, "error": str(e)})

    if errors:
        raise Exception(f"errores procesando {len(errors)} records: {errors}")

    return {"statusCode": 200, "scheduled": len(event.get("Records", []))}
