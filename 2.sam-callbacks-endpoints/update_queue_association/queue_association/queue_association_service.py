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
from typing import TYPE_CHECKING

from aws_lambda_powertools import Logger

if TYPE_CHECKING:
    from mypy_boto3_dynamodb.service_resource import Table

from queue_association.model.queue_association import QueueAssociation

logger: Logger = Logger()
logger.setLevel(logging.INFO)


class QueueAssociationService:
    """Manage `QueueAssociation` in DynamoDB."""

    def __init__(self, table: Table):
        self.table = table

    def getByQueueArn(self, queueArn: str) -> QueueAssociation | None:
        """Get a `QueueAssociation` by its `queue_arn` (partition key)."""
        response = self.table.get_item(Key={'queue_arn': queueArn})

        if 'Item' not in response:
            return None

        return QueueAssociation.fromDict(response['Item'])

    def updateForceCallbackEnable(self, queueArn: str, forceCallbackEnable: bool) -> QueueAssociation:
        """
        Update the `force_callback_enable` flag for a queue association entry.

        Args:
            queueArn: Primary key (`queue_arn`) of the record to update
            forceCallbackEnable: New value for `force_callback_enable`

        Returns:
            Updated QueueAssociation object
        """
        from botocore.exceptions import ClientError

        try:
            response = self.table.update_item(
                Key={'queue_arn': queueArn},
                UpdateExpression='SET force_callback_enable = :value',
                ConditionExpression='attribute_exists(queue_arn)',
                ExpressionAttributeValues={':value': forceCallbackEnable},
                ReturnValues='ALL_NEW'
            )

            item = response.get('Attributes', {})
            return QueueAssociation.fromDict(item)

        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', '')
            if error_code == 'ConditionalCheckFailedException':
                raise ValueError(f"Queue association with queue_arn '{queueArn}' not found")
            raise
