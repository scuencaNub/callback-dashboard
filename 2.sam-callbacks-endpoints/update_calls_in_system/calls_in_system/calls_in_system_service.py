#
# This file is part of Nubity Python Skeleton.
#
# (c) Nubity Inc. <esa@nubity.com>.
#
# This source file is subject to a proprietary license that is bundled
# with this source code in the file LICENSE.
#
import json
from typing import Any, Dict

from botocore.exceptions import ClientError
from calls_in_system.model.calls_in_system import CallsInSystem, normalize_timestamp
from calls_in_system.model.status import Status


class CallsInSystemService:
    """Manage `CallsInSystem` records in DynamoDB."""

    def __init__(self, table):
        self.table = table

    def update(self, contact_id_inbound: str, call_at: str, update_fields: Dict[str, Any]) -> CallsInSystem:
        """
        Update a CallsInSystem record in DynamoDB.
        
        Args:
            contact_id_inbound: Partition key of the record to update
            call_at: Sort key of the record to update (current call_at value)
            update_fields: Dictionary with fields to update (snake_case keys)
                          Note: If updating call_at, the new value will be in update_fields
                          but the Key will use the original call_at value
            
        Returns:
            Updated CallsInSystem object
            
        Raises:
            ClientError: If the item doesn't exist or update fails
        """
        # Map of API field names (snake_case) to DynamoDB attribute names
        field_mapping = {
            'queue_id': 'queue_id',
            'queue_name': 'queue_name',
            'call_at': 'call_at',
            'status': 'status',
            'retries': 'retries',
            'contact_flow_id': 'contact_flow_id',
            'outbound_phone_number': 'outbound_phone_number',
            'agent_id': 'agent_id',
            'agent_name': 'agent_name',
            'contact_id_outbound': 'contact_id_outbound',
            'retry_attempt_interval': 'retry_attempt_interval',
            'timestamp': 'timestamp'
        }

        # Build UpdateExpression dynamically
        update_expressions = []
        expression_attribute_values = {}
        expression_attribute_names = {}
        
        # Track if call_at is being updated
        new_call_at = None

        for field, value in update_fields.items():
            if field not in field_mapping:
                continue  # Skip unknown fields

            dynamodb_field = field_mapping[field]
            

            if field == 'status':
                # Validate status enum
                try:
                    Status(value)
                except ValueError:
                    raise ValueError(f"Invalid status value: {value}")
            
            if field == 'timestamp':
                # Normalize timestamp to dict
                value = normalize_timestamp(value)
            
            if field == 'call_at':
                # Store new call_at value but don't add to update expression yet
                # We'll handle this specially if needed
                new_call_at = value
                continue
            

            placeholder = f":{field}"
            name_placeholder = f"#{field}"
            
            update_expressions.append(f"{name_placeholder} = {placeholder}")
            expression_attribute_values[placeholder] = value
            expression_attribute_names[name_placeholder] = dynamodb_field

        # If call_at is being updated, add it to the update expression
        if new_call_at is not None:
            placeholder = ":call_at"
            name_placeholder = "#call_at"
            update_expressions.append(f"{name_placeholder} = {placeholder}")
            expression_attribute_values[placeholder] = new_call_at
            expression_attribute_names[name_placeholder] = 'call_at'

        if not update_expressions:
            raise ValueError("No valid fields to update")

        update_expression = "SET " + ", ".join(update_expressions)

        try:
            # Use both partition key and sort key
            # Use ConditionExpression to ensure the item exists
            response = self.table.update_item(
                Key={
                    'contact_id_inbound': contact_id_inbound,
                    'call_at': call_at
                },
                UpdateExpression=update_expression,
                ExpressionAttributeNames=expression_attribute_names,
                ExpressionAttributeValues=expression_attribute_values,
                ConditionExpression='attribute_exists(contact_id_inbound) AND attribute_exists(call_at)',
                ReturnValues='ALL_NEW'
            )

            # Normalize timestamp in response
            item = response.get('Attributes', {})
            if 'timestamp' in item:
                item['timestamp'] = normalize_timestamp(item['timestamp'])

            return CallsInSystem.fromDict(item)

        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', '')
            if error_code == 'ConditionalCheckFailedException':
                raise ValueError(f"Call with contact_id_inbound '{contact_id_inbound}' not found")
            raise

