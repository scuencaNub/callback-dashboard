#
# This file is part of Nubity Python Skeleton.
#
# (c) Nubity Inc. <esa@nubity.com>.
#
# This source file is subject to a proprietary license that is bundled
# with this source code in the file LICENSE.
#
import json
import logging
import os
import re
import time
from typing import Any, Dict

import boto3
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

from api_rest.http_response_factory import HttpResponseFactory
from api_rest.log import build_event_log, mask_phone_list

logger: Logger = Logger()
logger.setLevel(logging.INFO)

DATETIME_RE = re.compile(
    r"^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?$"
)
PHONE_RE = re.compile(r"^\+?\d[\d\-\s]{4,18}\d$")

athena = boto3.client("athena", region_name=os.getenv("AWS_REGION", "us-east-1"))


def _validate_date(value: str, field_name: str) -> str:
    value = value.strip()
    if not DATETIME_RE.match(value):
        raise ValueError(
            f"{field_name} must match YYYY-MM-DD or YYYY-MM-DD HH:MM:SS"
        )
    return value


def _validate_phone(value: str) -> str:
    value = value.strip()
    if not PHONE_RE.match(value):
        raise ValueError(f"Invalid phone number format: {value}")
    return value


def lambda_handler(event: Dict[str, Any], context: LambdaContext) -> Dict[str, Any]:
    """
    Query Amazon Connect contacts using Athena.
    
    HTTP Method: POST
    Path: /connect-contacts/report-by-date
    
    Response:
    {
        "items": [...],
        "total": 10
    }
    """
    logger.info('Context: %s', context)
    logger.info('Event summary: %s', build_event_log(event))

    headers = {
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
    }

    try:
        # Handle OPTIONS request for CORS
        if 'OPTIONS' == event.get('httpMethod'):
            return HttpResponseFactory.create(200, {}, headers)

        # Parse request body (API Gateway sends body as string)
        body_str = event.get('body', '{}')
        try:
            body = json.loads(body_str) if isinstance(body_str, str) else body_str
        except (json.JSONDecodeError, TypeError):
            return HttpResponseFactory.create(
                400,
                {'error': 'Invalid JSON in request body'},
                headers
            )

        # Validate required parameters
        phone_numbers = body.get("phone_numbers", [])
        start_date = body.get("start_date")
        end_date = body.get("end_date")

        # phone_numbers is optional, but if present it must be a list
        if phone_numbers is not None and phone_numbers != [] and not isinstance(phone_numbers, list):
            return HttpResponseFactory.create(
                400,
                {'error': 'phone_numbers must be an array when provided'},
                headers
            )

        if not start_date or not end_date:
            return HttpResponseFactory.create(
                400,
                {'error': 'start_date and end_date are required'},
                headers
            )

        try:
            start_date = _validate_date(str(start_date), "start_date")
            end_date = _validate_date(str(end_date), "end_date")
        except ValueError as ve:
            return HttpResponseFactory.create(
                400, {'error': str(ve)}, headers
            )

        # Get environment variables
        database = os.getenv("ATHENA_DATABASE", "bpac-crt-callback-analytics")
        output_bucket = os.getenv("ATHENA_OUTPUT_BUCKET")
        output_prefix = os.getenv("ATHENA_OUTPUT_PREFIX", "athena-results/")
        table_name = os.getenv("ATHENA_TABLE_NAME", "calls_in_system_history")

        if not output_bucket:
            return HttpResponseFactory.create(
                500,
                {'error': 'ATHENA_OUTPUT_BUCKET environment variable is not set'},
                headers
            )

        normalized_phone_numbers = []
        if isinstance(phone_numbers, list):
            for phone in phone_numbers:
                if not isinstance(phone, str):
                    continue
                phone = phone.strip()
                if not phone:
                    continue
                if not phone.startswith('+'):
                    phone = '+' + phone
                try:
                    phone = _validate_phone(phone)
                except ValueError:
                    return HttpResponseFactory.create(
                        400,
                        {'error': f'Invalid phone number format: {phone}'},
                        headers
                    )
                normalized_phone_numbers.append(phone)

        if phone_numbers:
            logger.info("Provided phone numbers (masked): %s", mask_phone_list([str(p) for p in phone_numbers if isinstance(p, str)]))
            logger.info("Normalized phone numbers (masked): %s", mask_phone_list(normalized_phone_numbers))

        # Build the Athena query
        phone_filter_clause = ""
        if normalized_phone_numbers:
            phone_list = "', '".join(normalized_phone_numbers)
            phone_filter_clause = f"AND customer_phone_number IN ('{phone_list}')"

        query = f"""
            SELECT
                *
            FROM "{database}"."{table_name}" AS c
            WHERE cast(call_at as timestamp) >= timestamp '{start_date}'
            AND cast(call_at as timestamp) <  timestamp '{end_date}'
            {phone_filter_clause}
            ORDER BY call_at DESC
        """

        logger.info("Executing Athena query for connect contacts (date-range only)")
        logger.info(f"Date range: {start_date} to {end_date}")
        logger.info(f"Database: {database}")
        logger.info(f"Table: {table_name}")
        logger.info("Query prepared with %d phone filters", len(normalized_phone_numbers))

        # Start Athena query execution
        response = athena.start_query_execution(
            QueryString=query,
            QueryExecutionContext={"Database": database},
            ResultConfiguration={
                "OutputLocation": f"s3://{output_bucket}/{output_prefix}"
            },
        )

        query_execution_id = response["QueryExecutionId"]
        logger.info(f"Started Athena query. QueryExecutionId={query_execution_id}")

        # Wait for query to complete (with timeout)
        max_wait_time = 300  # 5 minutes max wait
        elapsed_time = 0
        while elapsed_time < max_wait_time:
            exec_resp = athena.get_query_execution(QueryExecutionId=query_execution_id)
            status = exec_resp["QueryExecution"]["Status"]
            state = status["State"]

            if state in ("SUCCEEDED", "FAILED", "CANCELLED"):
                break

            time.sleep(2)
            elapsed_time += 2

        reason = status.get("StateChangeReason", "")
        logger.info(f"Query state={state}, reason={reason}")

        if state != "SUCCEEDED":
            return HttpResponseFactory.create(
                500,
                {
                    'error': 'Query failed',
                    'state': state,
                    'reason': reason,
                    'queryExecutionId': query_execution_id,
                },
                headers
            )

        # Get ALL results (with pagination)
        all_items = []
        headers_list = None
        next_token = None
        
        while True:
            params = {"QueryExecutionId": query_execution_id}
            if next_token:
                params["NextToken"] = next_token
            
            result_data = athena.get_query_results(**params)
            rows = result_data["ResultSet"]["Rows"]
            
            if not rows:
                break
            
            # First iteration: get headers
            if headers_list is None:
                headers_list = [col.get("VarCharValue") for col in rows[0]["Data"]]
                rows = rows[1:]  # Skip header
            
            # Process rows
            for row in rows:
                values = [col.get("VarCharValue") for col in row["Data"]]
                all_items.append(dict(zip(headers_list, values)))
            
            # Check if there are more results
            next_token = result_data.get("NextToken")
            if not next_token:
                break
        
        logger.info(f"Total items retrieved: {len(all_items)}")
        
        # Return results directly
        return HttpResponseFactory.create(
            200,
            {
                'items': all_items,
                'total': len(all_items),
                'queryExecutionId': query_execution_id,
            },
            headers
        )

    except Exception as e:
        logger.error(f'Error in query_connect_contacts: {str(e)}', exc_info=True)
        return HttpResponseFactory.create(
            500,
            {
                'error': 'Internal server error',
                'message': 'Failed to query Connect contacts'
            },
            headers
        )
