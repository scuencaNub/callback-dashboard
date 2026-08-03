from __future__ import annotations

import logging
from typing import TYPE_CHECKING, List, Optional

from aws_lambda_powertools import Logger

if TYPE_CHECKING:
    from mypy_boto3_dynamodb.service_resource import Table

from queue_group_info.queue_group_info import QueueGroupInfo

logger: Logger = Logger()
logger.setLevel(logging.INFO)


class QueueGroupInfoService:
    """Manage `QueueGroupInfo` in DynamoDB."""

    def __init__(self, table: Table):
        self.table = table

    def findAll(self) -> List[QueueGroupInfo]:
        """Get all queue group info entries."""
        try:
            response = self.table.scan()
            return [QueueGroupInfo.fromDict(item) for item in response.get('Items', [])]
        except Exception as e:
            logger.error(f'Error getting all queue group info: "{str(e)}".')
            raise

    def getByName(self, queue_group_name: str) -> Optional[QueueGroupInfo]:
        """Get a single entry by queue_group_name (PK)."""
        response = self.table.get_item(Key={'queue_group_name': queue_group_name})
        item = response.get('Item')
        if not item:
            return None
        return QueueGroupInfo.fromDict(item)

    def update(self, queue_group_name: str, after_threshold_behavior: str) -> Optional[QueueGroupInfo]:
        """Update after_threshold_behavior for a queue group. Returns None if not found."""
        existing = self.getByName(queue_group_name)
        if not existing:
            return None

        self.table.update_item(
            Key={'queue_group_name': queue_group_name},
            UpdateExpression='SET after_threshold_behavior = :val',
            ExpressionAttributeValues={':val': after_threshold_behavior},
        )

        existing.after_threshold_behavior = after_threshold_behavior
        return existing
