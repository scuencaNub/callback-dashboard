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
from typing import TYPE_CHECKING, List

from aws_lambda_powertools import Logger

if TYPE_CHECKING:
    from mypy_boto3_dynamodb.service_resource import Table

from calls_in_system_summary.model.registered_call import RegisteredCall

logger: Logger = Logger()
logger.setLevel(logging.INFO)

GSI_NAME = 'queue_name-call_at-index'


class CallsInSystemSummaryService:
    """Query CallsInSystem directly via queue_name-call_at-index.

    call_at is the scheduling date (when the callback is set to happen),
    so a query bounded to the requested day is exact -- no lookahead
    window needed. The lookahead was only required in the previous
    design that bucketed by registration date and had to guess how far
    in the future call_at could land.
    """

    def __init__(self, table: Table):
        self.table = table

    def findByQueueNameAndCallAtDateRange(
        self,
        queueName: str,
        startCallAt: str,
        endCallAt: str,
    ) -> List[RegisteredCall]:
        """Get all CallsInSystem rows for a queue within a call_at range
        (inclusive). Handles pagination internally."""
        try:
            queryParams = {
                'IndexName': GSI_NAME,
                'KeyConditionExpression': (
                    '#queue_name = :queue_name AND #call_at BETWEEN :start AND :end'
                ),
                'ExpressionAttributeNames': {
                    '#queue_name': 'queue_name',
                    '#call_at': 'call_at',
                },
                'ExpressionAttributeValues': {
                    ':queue_name': queueName,
                    ':start': startCallAt,
                    ':end': endCallAt,
                },
            }

            response = self.table.query(**queryParams)
            calls = [RegisteredCall.fromDict(item) for item in response.get('Items', [])]

            while 'LastEvaluatedKey' in response:
                response = self.table.query(
                    **queryParams,
                    ExclusiveStartKey=response['LastEvaluatedKey'],
                )
                calls.extend(RegisteredCall.fromDict(item) for item in response.get('Items', []))

            return calls
        except Exception as e:
            logger.error(
                f'Error querying CallsInSystem for queue "{queueName}" '
                f'between "{startCallAt}" and "{endCallAt}": "{str(e)}".'
            )
            raise
