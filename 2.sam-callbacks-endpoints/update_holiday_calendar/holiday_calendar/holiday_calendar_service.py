#
# This file is part of Nubity Python Skeleton.
#
# (c) Nubity Inc. <esa@nubity.com>.
#
# This source file is subject to a proprietary license that is bundled
# with this source code in the file LICENSE.
#

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict

if TYPE_CHECKING:
    from mypy_boto3_dynamodb.service_resource import Table

from holiday_calendar.model.holiday_calendar import HolidayCalendar


class HolidayCalendarService:


    def __init__(self, table: Table):
        self.table = table

    def getByDate(self, date: str) -> HolidayCalendar | None:

        response = self.table.get_item(Key={'date': date})

        if 'Item' not in response:
            return None

        item = response['Item']

        return HolidayCalendar.fromDict(item)

    def getAllHolidays(self) -> list[Dict[str, Any]]:

        response = self.table.scan()

        holidays = []
        for item in response['Items']:
            holiday = HolidayCalendar.fromDict(item)
            holidays.append(holiday)

        return holidays

    def create(self, holiday: HolidayCalendar) -> HolidayCalendar:

        item = {
            'date': holiday.date,
            'name': holiday.name,
            'description': holiday.description,
            'configuration_type': holiday.configurationType.value,
            'queue_overrides': holiday.queue_overrides
        }
        
        self.table.put_item(Item=item)
        return holiday

    def update(self, date: str, update_fields: Dict[str, Any]) -> HolidayCalendar:
        """
        Update a holiday calendar entry.
        
        Args:
            date: Primary key of the record to update
            update_fields: Dictionary with fields to update
            
        Returns:
            Updated HolidayCalendar object
        """
        from botocore.exceptions import ClientError
        from holiday_calendar.model.configuration_type import ConfigurationType

        # Build UpdateExpression dynamically
        update_expressions = []
        expression_attribute_values = {}
        expression_attribute_names = {}

        field_mapping = {
            'name': 'name',
            'description': 'description',
            'configuration_type': 'configuration_type',
            'queue_overrides': 'queue_overrides'
        }

        for field, value in update_fields.items():
            if field not in field_mapping:
                continue

            dynamodb_field = field_mapping[field]


            if field == 'configuration_type':
                # Validate configuration type enum
                try:
                    ConfigurationType(value)
                except ValueError:
                    raise ValueError(f"Invalid configuration_type value: {value}")


            placeholder = f":{field}"
            name_placeholder = f"#{field}"

            update_expressions.append(f"{name_placeholder} = {placeholder}")
            expression_attribute_values[placeholder] = value
            expression_attribute_names[name_placeholder] = dynamodb_field

        if not update_expressions:
            raise ValueError("No valid fields to update")

        update_expression = "SET " + ", ".join(update_expressions)

        try:
            # Add date to expression attribute names for ConditionExpression
            expression_attribute_names['#date'] = 'date'
            
            # Use ConditionExpression to ensure the item exists
            response = self.table.update_item(
                Key={'date': date},
                UpdateExpression=update_expression,
                ExpressionAttributeNames=expression_attribute_names,
                ExpressionAttributeValues=expression_attribute_values,
                ConditionExpression='attribute_exists(#date)',
                ReturnValues='ALL_NEW'
            )

            item = response.get('Attributes', {})
            return HolidayCalendar.fromDict(item)

        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', '')
            if error_code == 'ConditionalCheckFailedException':
                raise ValueError(f"Holiday with date '{date}' not found")
            raise

    def delete(self, date: str) -> None:
        """
        Delete a holiday calendar entry by date.
        Raises ValueError if the item does not exist.
        """
        from botocore.exceptions import ClientError

        try:
            self.table.delete_item(
                Key={'date': date},
                ExpressionAttributeNames={'#date': 'date'},
                ConditionExpression='attribute_exists(#date)',
            )
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', '')
            if error_code == 'ConditionalCheckFailedException':
                raise ValueError(f"Holiday with date '{date}' not found")
            raise

