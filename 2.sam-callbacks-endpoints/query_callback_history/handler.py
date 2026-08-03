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
from typing import Any, Dict, List

import boto3
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

from api_rest.http_response_factory import HttpResponseFactory
from api_rest.log import build_event_log, mask_phone, mask_phone_list

logger: Logger = Logger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb", region_name=os.getenv("AWS_REGION", "us-east-1"))


def normalize_timestamp(value: Any) -> Dict[str, Any]:
    """Convierte cualquier formato de timestamp a dict."""
    if isinstance(value, dict):
        return value
    if not value:
        return {}
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            return {"CB_REGISTERED": value}
        return {"CB_REGISTERED": value}
    return {}


def lambda_handler(event: Dict[str, Any], context: LambdaContext) -> Dict[str, Any]:
    """
    Query callback history from DynamoDB by phone number(s) and date range.
    
    HTTP Method: POST
    Path: /callback-history/query
    
    Request Body:
    {
        "phone_numbers": ["+17877659800", "+17877880404"],
        "start_date": "2024-01-01",
        "end_date": "2024-12-31"
    }
    
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
        if 'OPTIONS' == event.get('httpMethod'):
            return HttpResponseFactory.create(200, {}, headers)

        body_str = event.get('body', '{}')
        try:
            body = json.loads(body_str) if isinstance(body_str, str) else body_str
        except (json.JSONDecodeError, TypeError):
            return HttpResponseFactory.create(
                400,
                {'error': 'Invalid JSON in request body'},
                headers
            )

        phone_numbers = body.get("phone_numbers", [])
        start_date = body.get("start_date")
        end_date = body.get("end_date")

        if not phone_numbers or not isinstance(phone_numbers, list):
            return HttpResponseFactory.create(
                400,
                {'error': 'phone_numbers is required and must be a non-empty array'},
                headers
            )

        if not start_date or not end_date:
            return HttpResponseFactory.create(
                400,
                {'error': 'start_date and end_date are required (format: YYYY-MM-DD)'},
                headers
            )

        table_name = os.getenv("DYNAMODB_TABLE_NAME")
        if not table_name:
            return HttpResponseFactory.create(
                500,
                {'error': 'DYNAMODB_TABLE_NAME environment variable is not set'},
                headers
            )

        table = dynamodb.Table(table_name)

        # Normalize phone numbers: ensure they all start with +
        normalized_phone_numbers = []
        for phone in phone_numbers:
            phone = phone.strip()
            if not phone.startswith('+'):
                phone = '+' + phone
            normalized_phone_numbers.append(phone)

        logger.info("Original phone numbers (masked): %s", mask_phone_list([str(p) for p in phone_numbers]))
        logger.info("Normalized phone numbers (masked): %s", mask_phone_list(normalized_phone_numbers))
        logger.info(f"Date range: {start_date} to {end_date}")
        logger.info(f"DynamoDB Table: {table_name}")

        # Format dates for DynamoDB query (YYYY-MM-DD HH:MM format)
        start_datetime = f"{start_date} 00:00"
        end_datetime = f"{end_date} 23:59"

        all_items = []
        seen_keys = set()  # To avoid duplicates

        # Query each phone number using the GSI: customer_phone_number-status-index
        for phone_number in normalized_phone_numbers:
            # Query all statuses for this phone number
            # We'll query each status separately and filter by date
            statuses = ["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED", "CANCELLED", "RESCHEDULED"]
            
            for status in statuses:
                try:
                    query_params = {
                        'IndexName': 'customer_phone_number-status-index',
                        'KeyConditionExpression': 'customer_phone_number = :phone AND #status = :status',
                        'FilterExpression': 'call_at BETWEEN :start_date AND :end_date',
                        'ExpressionAttributeNames': {
                            '#status': 'status'
                        },
                        'ExpressionAttributeValues': {
                            ':phone': phone_number,
                            ':status': status,
                            ':start_date': start_datetime,
                            ':end_date': end_datetime
                        }
                    }

                    response = table.query(**query_params)

                    for item in response.get('Items', []):
                        # Create unique key to avoid duplicates
                        item_key = f"{item.get('contact_id_inbound')}_{item.get('call_at')}"
                        if item_key not in seen_keys:
                            seen_keys.add(item_key)
                            item['timestamp'] = normalize_timestamp(item.get('timestamp'))
                            all_items.append(item)

                    # Handle pagination for this status
                    while 'LastEvaluatedKey' in response:
                        query_params['ExclusiveStartKey'] = response['LastEvaluatedKey']
                        response = table.query(**query_params)

                        for item in response.get('Items', []):
                            item_key = f"{item.get('contact_id_inbound')}_{item.get('call_at')}"
                            if item_key not in seen_keys:
                                seen_keys.add(item_key)
                                item['timestamp'] = normalize_timestamp(item.get('timestamp'))
                                all_items.append(item)

                except Exception as e:
                    error_type = type(e).__name__
                    if error_type == 'ResourceNotFoundException':
                        logger.error(
                            "ResourceNotFoundException querying status %s for phone %s. Table: %s, GSI: customer_phone_number-status-index.",
                            status,
                            mask_phone(phone_number),
                            table_name,
                        )
                    else:
                        logger.warning("Error querying status %s for phone %s", status, mask_phone(phone_number))
                    continue

        logger.info(f"Total items retrieved: {len(all_items)}")

        all_items.sort(key=lambda x: x.get('call_at', ''), reverse=True)

        return HttpResponseFactory.create(
            200,
            {
                'items': all_items,
                'total': len(all_items),
            },
            headers
        )

    except Exception as e:
        logger.error(f'Error in query_callback_history: {str(e)}', exc_info=True)
        return HttpResponseFactory.create(
            500,
            {
                'error': 'Internal server error',
                'message': 'Failed to query callback history'
            },
            headers
        )

