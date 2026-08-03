#
# This file is part of Nubity Python Skeleton.
#
# (c) Nubity Inc. <esa@nubity.com>.
#
# This source file is subject to a proprietary license that is bundled
# with this source code in the file LICENSE.
#

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Dict, List

from aws_lambda_powertools import Logger
from boto3.dynamodb.conditions import Key, Attr

if TYPE_CHECKING:
    from mypy_boto3_dynamodb.service_resource import Table, DynamoDBServiceResource

from active_contacts.model.active_contact import ActiveContact

logger: Logger = Logger()
logger.setLevel(logging.INFO)

GSI_NAME = 'queue_name-start_timestamp-index'
BATCH_GET_MAX_KEYS = 100


class ActiveContactsService:
    """Read ActiveContactsInFlow for the concurrency panel.

    start_timestamp is a fixed-offset PR timestamp
    ('YYYY-MM-DDTHH:MM:SS-0400'), so lexicographic string comparison
    matches chronological order and BETWEEN works directly on strings.
    """

    def __init__(self, table: Table, dynamoDbResource: "DynamoDBServiceResource | None" = None, tableName: str = ''):
        self.table = table
        self.dynamoDbResource = dynamoDbResource
        self.tableName = tableName

    def findByContactIds(self, contactIds: List[str]) -> Dict[str, ActiveContact]:
        """BatchGet ActiveContactsInFlow by contact_id (PK). Used to
        enrich contacts discovered via CallsInSystem (call_at eje) with
        offered/outcome/callback_type. Returns dict contact_id -> ActiveContact."""
        if not contactIds or self.dynamoDbResource is None:
            return {}

        uniqueIds = [cid for cid in dict.fromkeys(contactIds) if cid]
        result: Dict[str, ActiveContact] = {}

        for chunkStart in range(0, len(uniqueIds), BATCH_GET_MAX_KEYS):
            chunk = uniqueIds[chunkStart:chunkStart + BATCH_GET_MAX_KEYS]
            requestItems = {self.tableName: {'Keys': [{'contact_id': cid} for cid in chunk]}}
            try:
                while requestItems:
                    response = self.dynamoDbResource.batch_get_item(RequestItems=requestItems)
                    for item in response.get('Responses', {}).get(self.tableName, []):
                        entry = ActiveContact.fromDict(item)
                        if entry.contactId:
                            result[entry.contactId] = entry
                    requestItems = response.get('UnprocessedKeys') or {}
            except Exception as e:
                logger.error(f'Error batch-getting ActiveContactsInFlow: "{str(e)}".')
                raise

        return result

    def findByQueueAndTimestampRange(
        self,
        queueName: str,
        startTs: str,
        endTs: str,
    ) -> List[ActiveContact]:
        """Query the GSI for one queue within a start_timestamp range."""
        try:
            kwargs = {
                'IndexName': GSI_NAME,
                'KeyConditionExpression': (
                    Key('queue_name').eq(queueName)
                    & Key('start_timestamp').between(startTs, endTs)
                ),
            }
            response = self.table.query(**kwargs)
            rows = [ActiveContact.fromDict(i) for i in response.get('Items', [])]

            while 'LastEvaluatedKey' in response:
                response = self.table.query(
                    **kwargs, ExclusiveStartKey=response['LastEvaluatedKey']
                )
                rows.extend(ActiveContact.fromDict(i) for i in response.get('Items', []))

            return rows
        except Exception as e:
            logger.error(
                f'Error querying ActiveContactsInFlow for queue "{queueName}" '
                f'between "{startTs}" and "{endTs}": "{str(e)}".'
            )
            raise

    def findAllByTimestampRange(self, startTs: str, endTs: str) -> List[ActiveContact]:
        """Scan the GSI filtering by start_timestamp range (all queues).

        Used for the "all queues" view: no partition key is available so
        a scan with a filter is the only option that needs neither a
        hardcoded queue list nor a second table. The filter runs server
        side; only matching rows are returned.
        """
        try:
            kwargs = {
                'IndexName': GSI_NAME,
                'FilterExpression': Attr('start_timestamp').between(startTs, endTs),
            }
            response = self.table.scan(**kwargs)
            rows = [ActiveContact.fromDict(i) for i in response.get('Items', [])]

            while 'LastEvaluatedKey' in response:
                response = self.table.scan(
                    **kwargs, ExclusiveStartKey=response['LastEvaluatedKey']
                )
                rows.extend(ActiveContact.fromDict(i) for i in response.get('Items', []))

            return rows
        except Exception as e:
            logger.error(
                f'Error scanning ActiveContactsInFlow between '
                f'"{startTs}" and "{endTs}": "{str(e)}".'
            )
            raise
