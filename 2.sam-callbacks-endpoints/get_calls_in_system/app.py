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
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import os
from typing import Any, Dict, List
from enum import Enum

import boto3
from api_rest.log import build_event_log

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def normalize_timestamp(value: Any) -> Dict[str, Any]:
    """Convierte cualquier formato de timestamp a dict."""
    if isinstance(value, dict):
        return value
    if not value:  # None o string vacío
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

class Status(Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    FAILED = "FAILED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    RESCHEDULED = "RESCHEDULED"

# -------------------------
# CallsInSystem Model
# -------------------------
class CallsInSystem:
    def __init__(
        self,
        contactIdInbound: str,
        customerPhoneNumber: str,
        callAt: str,
        status: Status,
        queueName: str = '',
        queueId: str = '',
        retries: int = 0,
        contactFlowId: str = '',
        outboundPhoneNumber: str = '',
        agentId: str = '',
        agentName: str = '',
        callbackType: str = '',
        contactIdOutbound: str = '',
        retryAttemptInterval: int = 0,
        timestamp: Dict[str, Any] | None = None
    ):
        self.contactIdInbound = contactIdInbound
        self.customerPhoneNumber = customerPhoneNumber
        self.callAt = callAt
        self.status = status
        self.queueName = queueName
        self.queueId = queueId
        self.retries = retries
        self.contactFlowId = contactFlowId
        self.outboundPhoneNumber = outboundPhoneNumber
        self.agentId = agentId
        self.agentName = agentName
        self.callbackType = callbackType
        self.contactIdOutbound = contactIdOutbound
        self.retryAttemptInterval = retryAttemptInterval
        self.timestamp: Dict[str, Any] = timestamp or {}

    def toDict(self) -> Dict[str, Any]:
        return {
            'contact_id_inbound': self.contactIdInbound,
            'customer_phone_number': self.customerPhoneNumber,
            'call_at': self.callAt,
            'status': self.status.value,
            'queue_name': self.queueName,
            'queue_id': self.queueId,
            'retries': self.retries,
            'contact_flow_id': self.contactFlowId,
            'outbound_phone_number': self.outboundPhoneNumber,
            'agent_id': self.agentId,
            'agent_name': self.agentName,
            'callback_type': self.callbackType,
            'contact_id_outbound': self.contactIdOutbound,
            'retry_attempt_interval': self.retryAttemptInterval,
            'timestamp': self.timestamp
        }

    @classmethod
    def fromDict(cls, data: Dict[str, Any]) -> 'CallsInSystem':
        return cls(
            contactIdInbound=data.get('contact_id_inbound', ''),
            customerPhoneNumber=data.get('customer_phone_number', ''),
            callAt=data.get('call_at', ''),
            status=Status(data.get('status', '')),
            queueName=data.get('queue_name', ''),
            queueId=data.get('queue_id', ''),
            retries=int(data.get('retries', 0)),
            contactFlowId=data.get('contact_flow_id', ''),
            outboundPhoneNumber=data.get('outbound_phone_number', ''),
            agentId=data.get('agent_id', ''),
            agentName=data.get('agent_name', ''),
            callbackType=data.get('callback_type', ''),
            contactIdOutbound=data.get('contact_id_outbound', ''),
            retryAttemptInterval=int(data.get('retry_attempt_interval', 0)),
            timestamp=normalize_timestamp(data.get('timestamp'))
        )

# -------------------------
# DynamoDB Client
# -------------------------
def get_dynamodb_table():
    table_name = os.environ.get('DYNAMODB_TABLE_NAME', '').strip()
    if not table_name:
        raise RuntimeError('DYNAMODB_TABLE_NAME environment variable is required')
    
    kwargs = {}
    region = os.environ.get('DYNAMODB_REGION', '').strip()
    uri = os.environ.get('DYNAMODB_URI', '').strip()
    if region:
        kwargs['region_name'] = region
    if uri:
        kwargs['endpoint_url'] = uri
    
    return boto3.resource('dynamodb', **kwargs).Table(table_name)

# -------------------------
# CallsInSystemService
# -------------------------
class CallsInSystemService:
    def __init__(self, table):
        self.table = table

    def findAllPaginatedByStatusList(
        self,
        pageSize: int,
        statusListWithOffsets: List[Dict[str, Any]],
        startTime: str,
        endTime: str
    ) -> Dict[str, Any]:
     
        result = {
            'items': [],
            'offsets': []
        }

        if not statusListWithOffsets:
            statusListWithOffsets = [{'status': status.value, 'offset': None} for status in Status]

        for statusData in statusListWithOffsets:
            status = statusData['status']
            offset = statusData.get('offset')

            params = {
                'IndexName': 'status-call_at-index',
                'KeyConditionExpression': '#status = :status AND #call_at BETWEEN :startTime AND :endTime',
                'ExpressionAttributeNames': {
                    '#status': 'status',
                    '#call_at': 'call_at'
                },
                'ExpressionAttributeValues': {
                    ':status': status,
                    ':startTime': startTime,
                    ':endTime': endTime
                },
                'Limit': pageSize
            }

            if offset:
                params['ExclusiveStartKey'] = offset

            # Floci doesn't support signed queries on GSI - fallback to scan in local mode
            use_local_fallback = bool(os.environ.get('DYNAMODB_URI', ''))
            logger.info(f"DYNAMODB_URI={os.environ.get('DYNAMODB_URI', 'NOT SET')}, use_local_fallback={use_local_fallback}")
            
            if use_local_fallback:
                scan_params = {
                    'FilterExpression': '#status = :status AND #call_at BETWEEN :startTime AND :endTime',
                    'ExpressionAttributeNames': {
                        '#status': 'status',
                        '#call_at': 'call_at'
                    },
                    'ExpressionAttributeValues': {
                        ':status': status,
                        ':startTime': startTime,
                        ':endTime': endTime
                    },
                    'Limit': pageSize
                }
                if offset:
                    scan_params['ExclusiveStartKey'] = offset
                response = self.table.scan(**scan_params)
            else:
                response = self.table.query(**params)

            for item in response.get('Items', []):
                # normalizamos timestamp
                item['timestamp'] = normalize_timestamp(item.get('timestamp'))
                callsInSystem = CallsInSystem.fromDict(item)
                result['items'].append(callsInSystem.toDict())

            lastEvaluatedKey = response.get('LastEvaluatedKey')

            if lastEvaluatedKey:
                result['offsets'].append({
                    'status': status,
                    'offset': lastEvaluatedKey
                })

        return result

# -------------------------
# Handler
# -------------------------
def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle request to retrieve paginated calls in system by status."""
    logger.info('Context: %s', context)
    logger.info('Event summary: %s', build_event_log(event))
    cors_allowed_origin = os.environ.get('CORS_ALLOWED_ORIGIN', '*')

    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': cors_allowed_origin,
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'POST,OPTIONS',
                'Access-Control-Allow-Credentials': 'false'
            },
            'body': json.dumps({})
        }

    defaultHeaders = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': cors_allowed_origin,
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Allow-Credentials': 'false'
    }

    try:
        try:
            if isinstance(event.get('body'), str):
                body = json.loads(event.get('body', '{}'))
            else:
                body = event.get('body', {})
        except json.JSONDecodeError:
            body = {}

        pageSize = body.get('page_size', 10)
        nextPageTokenList = body.get('next_page_token', [])

        table = get_dynamodb_table()
        service = CallsInSystemService(table)

        todayUtc = datetime.now(ZoneInfo('UTC')).date()
        yesterdayUtc = todayUtc - timedelta(days=0)
        startOfDayUtc = datetime.combine(yesterdayUtc, datetime.min.time(), ZoneInfo('UTC')).strftime('%Y-%m-%d %H:%M')
        endOfDayUtc = datetime.combine(yesterdayUtc, datetime.max.time(), ZoneInfo('UTC')).strftime('%Y-%m-%d %H:%M')
        logger.info('startOfDayUtc: %s', startOfDayUtc)
        logger.info('endOfDayUtc: %s', endOfDayUtc)

        result = service.findAllPaginatedByStatusList(
            pageSize,
            nextPageTokenList,
            startOfDayUtc,
            endOfDayUtc
        )

        responseData = {
            'items': result['items'],
            'nextPageToken': result['offsets']
        }

        return {
            'statusCode': 200,
            'headers': defaultHeaders,
            'body': json.dumps(responseData)
        }
    except Exception:
        logger.exception('Error in get_calls_in_system')
        return {
            'statusCode': 500,
            'headers': defaultHeaders,
            'body': json.dumps({
                'error': 'Internal server error',
                'message': 'Failed to retrieve calls in system.'
            })
        }

