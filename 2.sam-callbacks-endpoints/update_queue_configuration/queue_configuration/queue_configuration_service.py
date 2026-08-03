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
from typing import TYPE_CHECKING, Any, Dict, List

from aws_lambda_powertools import Logger

if TYPE_CHECKING:
    from mypy_boto3_dynamodb.service_resource import Table

from queue_configuration.model.queue_configuration import QueueConfiguration

logger: Logger = Logger()
logger.setLevel(logging.INFO)


class QueueConfigurationService:
    """Manage `QueueConfiguration` in DynamoDB."""

    def __init__(self, table: Table):
        self.table = table

    def getById(self, queueConfigurationId: str) -> QueueConfiguration | None:
        """Get a `QueueConfiguration` by id."""
        response = self.table.get_item(Key={'queue_id': queueConfigurationId})

        if 'Item' not in response:
            return None

        item = response['Item']

        return QueueConfiguration.fromDict(item)

    def findAll(self) -> List[QueueConfiguration]:
        """Get all `QueueConfiguration`."""
        try:
            response = self.table.scan()

            configurations = []

            for item in response.get('Items', []):
                config = QueueConfiguration.fromDict(item)
                configurations.append(config)

            return configurations
        except Exception as e:
            logger.error(f'Error getting all configurations: "{str(e)}".')

            raise

    def getByQueueName(self, queueName: str) -> QueueConfiguration | None:
        """Get a `QueueConfiguration` by queue name."""
        try:
            logger.info(f'Searching for queue with name: "{queueName}"')
            response = self.table.scan(
                FilterExpression='queue_name = :name',
                ExpressionAttributeValues={':name': queueName}
            )

            items = response.get('Items', [])
            logger.info(f'Found {len(items)} items matching queue_name "{queueName}"')
            
            if not items:
                logger.warning(f'No queue configuration found with name: "{queueName}"')
                return None

            # Return the first match (queue names should be unique)
            config = QueueConfiguration.fromDict(items[0])
            logger.info(f'Found queue configuration with queue_id: {config.queueId}')
            return config
        except Exception as e:
            logger.error(f'Error getting configuration by queue name "{queueName}": "{str(e)}".')
            import traceback
            logger.error(f'Traceback: {traceback.format_exc()}')
            raise

    def updateScheduleTimes(
            self,
            queueId: str,
            startTime: str,
            stopTime: str
    ) -> None:
        """Update schedule times and set `stop_time_asap_enable` to `True` for a queue configuration."""
        self.table.update_item(
            Key={'queue_id': queueId},
            UpdateExpression='SET start_time_asap = :start, stop_time_asap = :stop, stop_time_asap_enable = :enable',
            ExpressionAttributeValues={
                ':start': startTime,
                ':stop': stopTime,
                ':enable': True
            }
        )

    def disableStopTimeAsap(self, queueId: str) -> None:
        """Set `stop_time_asap_enable` to `False` for a queue configuration."""
        self.table.update_item(
            Key={'queue_id': queueId},
            UpdateExpression='SET stop_time_asap_enable = :enable',
            ExpressionAttributeValues={
                ':enable': False
            }
        )

    def update(self, queueId: str, update_fields: Dict[str, Any]) -> QueueConfiguration:
        """
        Update a queue configuration entry.
        
        Args:
            queueId: Primary key of the record to update
            update_fields: Dictionary with fields to update
            
        Returns:
            Updated QueueConfiguration object
        """
        from botocore.exceptions import ClientError
        from queue_configuration.model.callback_type import CallbackType

        # Build UpdateExpression dynamically
        update_expressions = []
        expression_attribute_values = {}
        expression_attribute_names = {}

        field_mapping = {
            'max_retry_attempts': 'max_retry_attempts',
            'retry_attempt_interval': 'retry_attempt_interval',
            'stop_on_voicemail': 'stop_on_voicemail',
            'allowed_callback_type': 'allowed_callback_type',
            'allow_only_next_day': 'allow_only_next_day',
            'business_hours_custom_message': 'business_hours_custom_message',
            'business_hours_enable': 'business_hours_enable',
            'start_time_asap': 'start_time_asap',
            'stop_time_asap': 'stop_time_asap',
            'stop_time_asap_enable': 'stop_time_asap_enable',
            'ewt_max_minutes_enable': 'ewt_max_minutes_enable',
            'ewt_max_minutes': 'ewt_max_minutes',
        }

        for field, value in update_fields.items():
            if field not in field_mapping:
                continue

            dynamodb_field = field_mapping[field]


            if field == 'allowed_callback_type':
                # Validate callback type enum
                try:
                    CallbackType(value)
                except ValueError:
                    raise ValueError(f"Invalid allowed_callback_type value: {value}")


            placeholder = f":{field.replace('_', '')}"
            name_placeholder = f"#{field.replace('_', '')}"

            update_expressions.append(f"{name_placeholder} = {placeholder}")
            expression_attribute_values[placeholder] = value
            expression_attribute_names[name_placeholder] = dynamodb_field

        if not update_expressions:
            raise ValueError("No valid fields to update")

        update_expression = "SET " + ", ".join(update_expressions)

        try:
            # Add queue_id to expression attribute names for ConditionExpression
            expression_attribute_names['#queue_id'] = 'queue_id'
            
            # Use ConditionExpression to ensure the item exists
            response = self.table.update_item(
                Key={'queue_id': queueId},
                UpdateExpression=update_expression,
                ExpressionAttributeNames=expression_attribute_names,
                ExpressionAttributeValues=expression_attribute_values,
                ConditionExpression='attribute_exists(#queue_id)',
                ReturnValues='ALL_NEW'
            )

            item = response.get('Attributes', {})
            return QueueConfiguration.fromDict(item)

        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', '')
            if error_code == 'ConditionalCheckFailedException':
                raise ValueError(f"Queue configuration with queue_id '{queueId}' not found")
            raise

