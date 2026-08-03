#
# This file is part of Nubity Python Skeleton.
#
# (c) Nubity Inc. <esa@nubity.com>.
#
# This source file is subject to a proprietary license that is bundled
# with this source code in the file LICENSE.
#

from __future__ import annotations

import json
import logging
from typing import TYPE_CHECKING, Dict, List

from aws_lambda_powertools import Logger
from boto3.dynamodb.conditions import Key, Attr

if TYPE_CHECKING:
    from mypy_boto3_dynamodb.service_resource import DynamoDBServiceResource, Table

logger: Logger = Logger()
logger.setLevel(logging.INFO)

BATCH_GET_MAX_KEYS = 100
GSI_NAME = 'queue_name-call_at-index'


class CallInfo:
    """What the panel needs from CallsInSystem for one contact:
    - callAt: scheduled callback time (UTC, 'YYYY-MM-DD HH:MM')
    - registered: callback actually registered (timestamp.CB_REGISTERED present)
    """

    def __init__(self, callAt: str, registered: bool):
        self.callAt = callAt
        self.registered = registered


class ScheduledCall:
    """A CallsInSystem row discovered via the call_at eje (a callback
    scheduled to happen in the queried window)."""

    def __init__(self, contactIdInbound: str, callAt: str, callbackType: str, queueName: str = ''):
        self.contactIdInbound = contactIdInbound
        self.callAt = callAt
        self.callbackType = callbackType
        self.queueName = queueName

    @classmethod
    def fromDict(cls, data: Dict) -> 'ScheduledCall':
        return cls(
            contactIdInbound=data.get('contact_id_inbound', '') or '',
            callAt=data.get('call_at', '') or '',
            callbackType=(data.get('callback_type', '') or '').upper(),
            queueName=data.get('queue_name', '') or '',
        )


def _has_cb_registered(timestamp) -> bool:
    if isinstance(timestamp, dict):
        return bool(timestamp.get('CB_REGISTERED'))
    if isinstance(timestamp, str) and timestamp:
        try:
            parsed = json.loads(timestamp)
            if isinstance(parsed, dict):
                return bool(parsed.get('CB_REGISTERED'))
        except Exception:
            return True
        return False
    return False


class CallsLookupService:
    """Read CallsInSystem for the concurrency panel.

    - by call_at range (GSI queue_name-call_at-index): the universe of
      scheduled callbacks in a window (the call_at eje).
    - by contact_id (BatchGet, PK contact_id_inbound): call_at + registered
      flag for a set of contacts.
    """

    def __init__(self, dynamoDbResource: DynamoDBServiceResource, table: Table, tableName: str):
        self.dynamoDbResource = dynamoDbResource
        self.table = table
        self.tableName = tableName

    def findByQueueAndCallAtRange(self, queueName: str, startCallAt: str, endCallAt: str) -> List[ScheduledCall]:
        """Scheduled callbacks for one queue with call_at in [start, end]."""
        try:
            kwargs = {
                'IndexName': GSI_NAME,
                'KeyConditionExpression': (
                    Key('queue_name').eq(queueName) & Key('call_at').between(startCallAt, endCallAt)
                ),
                'ProjectionExpression': 'contact_id_inbound, call_at, callback_type, queue_name',
            }
            response = self.table.query(**kwargs)
            rows = [ScheduledCall.fromDict(i) for i in response.get('Items', [])]
            while 'LastEvaluatedKey' in response:
                response = self.table.query(**kwargs, ExclusiveStartKey=response['LastEvaluatedKey'])
                rows.extend(ScheduledCall.fromDict(i) for i in response.get('Items', []))
            return rows
        except Exception as e:
            logger.error(f'Error querying CallsInSystem call_at for queue "{queueName}": "{str(e)}".')
            raise

    def findAllByCallAtRange(self, startCallAt: str, endCallAt: str) -> List[ScheduledCall]:
        """Scheduled callbacks across all queues with call_at in [start, end]
        (scan of the GSI, filtered server-side)."""
        try:
            kwargs = {
                'IndexName': GSI_NAME,
                'FilterExpression': Attr('call_at').between(startCallAt, endCallAt),
                'ProjectionExpression': 'contact_id_inbound, call_at, callback_type, queue_name',
            }
            response = self.table.scan(**kwargs)
            rows = [ScheduledCall.fromDict(i) for i in response.get('Items', [])]
            while 'LastEvaluatedKey' in response:
                response = self.table.scan(**kwargs, ExclusiveStartKey=response['LastEvaluatedKey'])
                rows.extend(ScheduledCall.fromDict(i) for i in response.get('Items', []))
            return rows
        except Exception as e:
            logger.error(f'Error scanning CallsInSystem call_at: "{str(e)}".')
            raise

    def findByContactIds(self, contactIds: List[str]) -> Dict[str, CallInfo]:
        """call_at + registered flag for a set of contact_id (BatchGet)."""
        if not contactIds:
            return {}

        uniqueIds = [cid for cid in dict.fromkeys(contactIds) if cid]
        result: Dict[str, CallInfo] = {}

        for chunkStart in range(0, len(uniqueIds), BATCH_GET_MAX_KEYS):
            chunk = uniqueIds[chunkStart:chunkStart + BATCH_GET_MAX_KEYS]
            requestItems = {
                self.tableName: {
                    'Keys': [{'contact_id_inbound': cid} for cid in chunk],
                    'ProjectionExpression': 'contact_id_inbound, call_at, #ts',
                    'ExpressionAttributeNames': {'#ts': 'timestamp'},
                }
            }
            try:
                while requestItems:
                    response = self.dynamoDbResource.batch_get_item(RequestItems=requestItems)
                    for item in response.get('Responses', {}).get(self.tableName, []):
                        cid = item.get('contact_id_inbound')
                        if not cid:
                            continue
                        result[cid] = CallInfo(
                            callAt=item.get('call_at', '') or '',
                            registered=_has_cb_registered(item.get('timestamp')),
                        )
                    requestItems = response.get('UnprocessedKeys') or {}
            except Exception as e:
                logger.error(f'Error batch-getting CallsInSystem: "{str(e)}".')
                raise

        return result
