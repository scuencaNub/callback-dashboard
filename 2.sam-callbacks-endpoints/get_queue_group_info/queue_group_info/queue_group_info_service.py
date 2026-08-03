from __future__ import annotations

import logging
from typing import TYPE_CHECKING, List

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
            items = []
            for item in response.get('Items', []):
                items.append(QueueGroupInfo.fromDict(item))
            return items
        except Exception as e:
            logger.error(f'Error getting all queue group info: "{str(e)}".')
            raise
