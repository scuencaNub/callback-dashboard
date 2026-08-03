import json
import logging
import os
import re
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import unquote

import boto3
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext
from botocore.exceptions import ClientError


logger: Logger = Logger()
logger.setLevel(logging.INFO)

DATETIME_RE = re.compile(r"^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?$")
PHONE_RE = re.compile(r"^\+?\d[\d\-\s]{4,18}\d$")

athena = boto3.client("athena", region_name=os.getenv("AWS_REGION", "us-east-1"))
s3_client = boto3.client("s3", region_name=os.getenv("AWS_REGION", "us-east-1"))


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_records_from_event(event: Dict[str, Any]) -> List[Dict[str, Any]]:
    records = event.get("Records") or []
    return [r for r in records if r.get("eventSource") == "aws:sqs"]


def validate_date(value: str, field_name: str) -> str:
    value = value.strip()
    if not DATETIME_RE.match(value):
        raise ValueError(
            f"{field_name} must match YYYY-MM-DD or YYYY-MM-DD HH:MM:SS"
        )
    return value


def validate_phone(value: str) -> str:
    value = value.strip()
    if not PHONE_RE.match(value):
        raise ValueError(f"Invalid phone number format: {value}")
    return value


def build_athena_query(
    database: str,
    table_name: str,
    start_date: str,
    end_date: str,
    normalized_phone_numbers: List[str],
) -> str:
    phone_filter_clause = ""
    if normalized_phone_numbers:
        phone_list = "', '".join(normalized_phone_numbers)
        phone_filter_clause = f"AND customer_phone_number IN ('{phone_list}')"

    return f"""
        SELECT
            contact_id_outbound,
            retries,
            flow_arn,
            contact_id_inbound,
            agent_name,
            queue_id,
            contact_flow_id,
            customer_phone_number,
            outbound_phone_number,

            format_datetime(date_add('hour', -4, CAST(call_at AS timestamp)), 'yyyy-MM-dd HH:mm:ss') AS call_at,

            status,
            callback_type,
            retry_attempt_interval,
            queue_name,
            agent_id,

            format_datetime(date_add('hour', -4, CAST(cb_registered AS timestamp)), 'yyyy-MM-dd HH:mm:ss') AS cb_registered,
            format_datetime(date_add('hour', -4, CAST(cb_retry_1 AS timestamp)), 'yyyy-MM-dd HH:mm:ss') AS cb_retry_1,
            format_datetime(date_add('hour', -4, CAST(completed AS timestamp)), 'yyyy-MM-dd HH:mm:ss') AS completed,
            format_datetime(date_add('hour', -4, CAST(failed AS timestamp)), 'yyyy-MM-dd HH:mm:ss') AS failed,
            format_datetime(date_add('hour', -4, CAST(cb_retry_2 AS timestamp)), 'yyyy-MM-dd HH:mm:ss') AS cb_retry_2,
            format_datetime(date_add('hour', -4, CAST(cb_retry_3 AS timestamp)), 'yyyy-MM-dd HH:mm:ss') AS cb_retry_3,
            format_datetime(date_add('hour', -4, CAST(cancelled AS timestamp)), 'yyyy-MM-dd HH:mm:ss') AS cancelled,
            format_datetime(date_add('hour', -4, CAST(rescheduled AS timestamp)), 'yyyy-MM-dd HH:mm:ss') AS rescheduled,
            format_datetime(date_add('hour', -4, CAST(timestamp_string AS timestamp)), 'yyyy-MM-dd HH:mm:ss') AS timestamp_string,

            ewt_given,
            ani,
            dnis,

            format_datetime(date_add('hour', -4, CAST(original_call_at AS timestamp)), 'yyyy-MM-dd HH:mm:ss') AS original_call_at

        FROM "{database}"."{table_name}" AS c
        WHERE CAST(call_at AS timestamp) >= timestamp '{start_date}'
        AND CAST(call_at AS timestamp) <  timestamp '{end_date}'
        {phone_filter_clause}
        ORDER BY CAST(call_at AS timestamp) DESC
    """


def parse_s3_uri(uri: str) -> Tuple[str, str]:
    raw = (uri or "").strip()
    if not raw.startswith("s3://"):
        raise ValueError(f"Invalid S3 URI for Athena output: {uri!r}")
    without_scheme = raw[5:]
    slash = without_scheme.find("/")
    if slash < 0:
        bucket = without_scheme
        if not bucket:
            raise ValueError(f"Invalid S3 URI (empty bucket): {uri!r}")
        return bucket, ""
    bucket = without_scheme[:slash]
    # Keep possible leading "/" in key. Athena can emit OutputLocation with
    # double slash (s3://bucket//query-id.csv), where object key is "/query-id.csv".
    key = unquote(without_scheme[slash + 1 :])
    if not bucket:
        raise ValueError(f"Invalid S3 URI (empty bucket): {uri!r}")
    return bucket, key


def s3_head_exists(bucket: str, key: str) -> bool:
    try:
        s3_client.head_object(Bucket=bucket, Key=key)
        return True
    except ClientError as exc:
        code = (exc.response.get("Error") or {}).get("Code", "")
        if code in ("404", "NoSuchKey", "NotFound"):
            return False
        raise


def resolve_athena_csv_object(
    output_uri: str,
    query_execution_id: str,
) -> Tuple[str, str]:
    """
    Athena often returns OutputLocation as a *folder* prefix; the CSV is
    {prefix}{query_execution_id}.csv.

    Sometimes the API returns the object path with a trailing slash after the
    file name (e.g. .../uuid.csv/). That is not a real folder; normalize and
    treat .../uuid.csv as the object key.
    """
    bucket, key = parse_s3_uri(output_uri)
    key = key.rstrip("/")

    if key.endswith(".csv"):
        if s3_head_exists(bucket, key):
            logger.info("Athena result object (direct .csv): s3://%s/%s", bucket, key)
            return bucket, key
        raise RuntimeError(
            f"Athena CSV not found at s3://{bucket}/{key} "
            f"(queryExecutionId={query_execution_id})"
        )

    prefix = (key + "/") if key else ""
    expected = f"{prefix}{query_execution_id}.csv"
    if s3_head_exists(bucket, expected):
        logger.info("Athena result object (by execution id): s3://%s/%s", bucket, expected)
        return bucket, expected

    paginator = s3_client.get_paginator("list_objects_v2")
    candidates: List[str] = []
    list_prefix = prefix if prefix else query_execution_id
    for page in paginator.paginate(Bucket=bucket, Prefix=list_prefix):
        for obj in page.get("Contents") or []:
            obj_key = obj.get("Key") or ""
            if not obj_key.endswith(".csv") or obj_key.endswith(".csv.metadata"):
                continue
            candidates.append(obj_key)

    if not candidates:
        raise RuntimeError(
            f"No Athena CSV result under s3://{bucket}/{prefix} "
            f"(queryExecutionId={query_execution_id})"
        )

    for obj_key in candidates:
        if query_execution_id in obj_key:
            logger.info("Athena result object (listed, matched id): s3://%s/%s", bucket, obj_key)
            return bucket, obj_key

    if len(candidates) == 1:
        obj_key = candidates[0]
        logger.info("Athena result object (listed, single): s3://%s/%s", bucket, obj_key)
        return bucket, obj_key

    raise RuntimeError(
        f"Ambiguous Athena CSV results under s3://{bucket}/{prefix}: {candidates[:10]}"
    )


def run_athena_query_until_succeeded(
    query: str,
    database: str,
    output_bucket: str,
    output_prefix: str,
    max_wait_time: int = 900,
) -> Tuple[str, str]:
    """
    Run Athena SELECT, wait until SUCCEEDED.
    Returns (ResultConfiguration.OutputLocation, QueryExecutionId).
    """
    logger.info("Executing Athena query (async worker)")
    response = athena.start_query_execution(
        QueryString=query,
        QueryExecutionContext={"Database": database},
        ResultConfiguration={
            "OutputLocation": f"s3://{output_bucket}/{output_prefix}"
        },
    )

    query_execution_id = response["QueryExecutionId"]
    logger.info("Started Athena query. QueryExecutionId=%s", query_execution_id)

    elapsed_time = 0
    status: Optional[Dict[str, Any]] = None
    output_location = ""

    while elapsed_time < max_wait_time:
        exec_resp = athena.get_query_execution(QueryExecutionId=query_execution_id)
        qe = exec_resp.get("QueryExecution") or {}
        status = qe.get("Status")
        if not status:
            raise RuntimeError("Athena query status not available")
        state = status["State"]

        if state in ("SUCCEEDED", "FAILED", "CANCELLED"):
            result_conf = qe.get("ResultConfiguration") or {}
            output_location = (result_conf.get("OutputLocation") or "").strip()
            break

        time.sleep(5)
        elapsed_time += 5

    if not status:
        raise RuntimeError("Athena query status not available")

    state = status["State"]
    reason = status.get("StateChangeReason", "")
    logger.info("Query state=%s, reason=%s", state, reason)

    if state != "SUCCEEDED":
        raise RuntimeError(
            f"Athena query failed: state={state}, reason={reason}, "
            f"queryExecutionId={query_execution_id}"
        )

    if not output_location:
        exec_resp = athena.get_query_execution(QueryExecutionId=query_execution_id)
        qe = exec_resp.get("QueryExecution") or {}
        result_conf = qe.get("ResultConfiguration") or {}
        output_location = (result_conf.get("OutputLocation") or "").strip()

    if not output_location:
        raise RuntimeError(
            f"Athena succeeded but OutputLocation missing: queryExecutionId={query_execution_id}"
        )

    logger.info("Athena output location: %s", output_location)
    return output_location, query_execution_id


def copy_s3_object_to_reports(
    src_bucket: str,
    src_key: str,
    dest_bucket: str,
    dest_key: str,
) -> None:
    logger.info(
        "Copying Athena result s3://%s/%s -> s3://%s/%s",
        src_bucket,
        src_key,
        dest_bucket,
        dest_key,
    )
    s3_client.copy_object(
        Bucket=dest_bucket,
        Key=dest_key,
        CopySource={"Bucket": src_bucket, "Key": src_key},
    )


def count_csv_data_rows_streaming(bucket: str, key: str) -> int:
    """Count data rows (excludes header line). Streams one line at a time."""
    response = s3_client.get_object(Bucket=bucket, Key=key)
    body = response["Body"]
    data_rows = 0
    first = True
    for _raw in body.iter_lines():
        if first:
            first = False
            continue
        data_rows += 1
    return data_rows


MAX_ROWS_COUNT_VIA_STREAM_BYTES = 200 * 1024 * 1024


def lambda_handler(event: Dict[str, Any], context: LambdaContext) -> None:
    logger.info("Context: %s", context)
    logger.info("Raw event: %s", json.dumps(event))

    reports_table_name = os.environ.get("REPORTS_TABLE_NAME", "")
    if not reports_table_name:
        logger.error("REPORTS_TABLE_NAME environment variable is required")
        return

    region = os.environ.get("DYNAMODB_REGION", "")
    dynamodb_uri = os.environ.get("DYNAMODB_URI", "")

    database = os.getenv("ATHENA_DATABASE")
    output_bucket = os.getenv("ATHENA_OUTPUT_BUCKET")
    output_prefix = os.getenv("ATHENA_OUTPUT_PREFIX", "athena-results/")
    table_name = os.getenv("ATHENA_TABLE_NAME")

    reports_bucket = os.getenv("REPORTS_BUCKET", output_bucket or "")
    reports_prefix = os.getenv("REPORTS_PREFIX", "reports/callbacks-by-date/")

    if not database or not output_bucket or not table_name or not reports_bucket:
        logger.error(
            "Missing required env vars for Athena/Reports: "
            "ATHENA_DATABASE, ATHENA_OUTPUT_BUCKET, ATHENA_TABLE_NAME, REPORTS_BUCKET"
        )
        return

    if dynamodb_uri:
        dynamodb = boto3.resource("dynamodb", endpoint_url=dynamodb_uri, region_name=region or None)
    else:
        dynamodb = boto3.resource("dynamodb", region_name=region or None)

    table = dynamodb.Table(reports_table_name)

    records = get_records_from_event(event)
    if not records:
        logger.info("No SQS records to process")
        return

    for record in records:
        body_str = record.get("body") or "{}"
        try:
            body = json.loads(body_str)
        except json.JSONDecodeError:
            logger.error("Invalid SQS message body: %s", body_str)
            continue

        report_id = body.get("reportId")
        report_type = body.get("type")

        if not report_id:
            logger.error("SQS message missing reportId: %s", body)
            continue

        logger.info("Processing report job: reportId=%s type=%s", report_id, report_type)

        try:
            # Obtener el job y parámetros
            job_resp = table.get_item(Key={"reportId": report_id})
            item = job_resp.get("Item")
            if not item:
                logger.error("Job not found in table for reportId=%s", report_id)
                continue

            params = item.get("params") or {}
            start_date_raw = params.get("start_date")
            end_date_raw = params.get("end_date")
            phone_numbers = params.get("phone_numbers", [])

            if not start_date_raw or not end_date_raw:
                raise ValueError("start_date and end_date are required in job params")

            start_date = validate_date(str(start_date_raw), "start_date")
            end_date = validate_date(str(end_date_raw), "end_date")

            normalized_phone_numbers: List[str] = []
            if isinstance(phone_numbers, list):
                for phone in phone_numbers:
                    if not isinstance(phone, str):
                        continue
                    phone = phone.strip()
                    if not phone:
                        continue
                    if not phone.startswith("+"):
                        phone = "+" + phone
                    phone = validate_phone(phone)
                    normalized_phone_numbers.append(phone)

            # Marcar como RUNNING
            table.update_item(
                Key={"reportId": report_id},
                UpdateExpression="SET #s = :running, startedAt = :startedAt",
                ExpressionAttributeNames={"#s": "status"},
                ExpressionAttributeValues={
                    ":running": "RUNNING",
                    ":startedAt": now_iso(),
                },
            )

            query = build_athena_query(
                database=database,
                table_name=table_name,
                start_date=start_date,
                end_date=end_date,
                normalized_phone_numbers=normalized_phone_numbers,
            )

            athena_output_uri, query_execution_id = run_athena_query_until_succeeded(
                query=query,
                database=database,
                output_bucket=output_bucket,
                output_prefix=output_prefix,
            )

            src_bucket, src_key = resolve_athena_csv_object(
                athena_output_uri,
                query_execution_id,
            )

            reports_key = f"{reports_prefix.rstrip('/')}/{report_id}.csv"
            copy_s3_object_to_reports(
                src_bucket=src_bucket,
                src_key=src_key,
                dest_bucket=reports_bucket,
                dest_key=reports_key,
            )

            result_location = f"s3://{reports_bucket}/{reports_key}"

            head = s3_client.head_object(Bucket=reports_bucket, Key=reports_key)
            object_size = int(head.get("ContentLength") or 0)

            finished_at = now_iso()
            if object_size <= MAX_ROWS_COUNT_VIA_STREAM_BYTES:
                row_count = count_csv_data_rows_streaming(reports_bucket, reports_key)
                logger.info(
                    "Report CSV copied, size=%s bytes, data rows=%s",
                    object_size,
                    row_count,
                )
                table.update_item(
                    Key={"reportId": report_id},
                    UpdateExpression=(
                        "SET #s = :succeeded, "
                        "finishedAt = :finishedAt, "
                        "resultLocation = :resultLocation, "
                        "totalRowCount = :totalRowCount"
                    ),
                    ExpressionAttributeNames={"#s": "status"},
                    ExpressionAttributeValues={
                        ":succeeded": "SUCCEEDED",
                        ":finishedAt": finished_at,
                        ":resultLocation": result_location,
                        ":totalRowCount": row_count,
                    },
                )
            else:
                logger.info(
                    "Report CSV copied, size=%s bytes (skip row count; over limit)",
                    object_size,
                )
                table.update_item(
                    Key={"reportId": report_id},
                    UpdateExpression=(
                        "SET #s = :succeeded, "
                        "finishedAt = :finishedAt, "
                        "resultLocation = :resultLocation "
                        "REMOVE totalRowCount"
                    ),
                    ExpressionAttributeNames={"#s": "status"},
                    ExpressionAttributeValues={
                        ":succeeded": "SUCCEEDED",
                        ":finishedAt": finished_at,
                        ":resultLocation": result_location,
                    },
                )

            logger.info("Report job completed: reportId=%s, location=%s", report_id, result_location)

        except Exception as exc:  # noqa: BLE001
            logger.exception("Error processing report job %s: %s", report_id, exc)
            try:
                table.update_item(
                    Key={"reportId": report_id},
                    UpdateExpression=(
                        "SET #s = :failed, finishedAt = :finishedAt, #err = :errMsg"
                    ),
                    ExpressionAttributeNames={"#s": "status", "#err": "error"},
                    ExpressionAttributeValues={
                        ":failed": "FAILED",
                        ":finishedAt": now_iso(),
                        ":errMsg": str(exc),
                    },
                )
            except Exception as update_exc:  # noqa: BLE001
                logger.exception(
                    "Failed to update job status to FAILED for %s: %s",
                    report_id,
                    update_exc,
                )

