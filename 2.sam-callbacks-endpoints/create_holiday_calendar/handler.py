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
import os
from typing import Any, Dict

from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

from api_rest.editor_authorization import require_editor_role
from api_rest.http_response_factory import HttpResponseFactory
from api_rest.log import build_event_log
from client.dynamo_db_client import DynamoDbClient
from holiday_calendar.holiday_calendar_service import HolidayCalendarService
from holiday_calendar.model.configuration_type import ConfigurationType
from holiday_calendar.model.holiday_calendar import HolidayCalendar

logger: Logger = Logger()
logger.setLevel(logging.INFO)


def lambda_handler(event: Dict[str, Any], context: LambdaContext) -> Dict[str, Any]:
    """
    Create a new holiday calendar entry.

    HTTP Method: POST
    Path: /holiday-calendars
    """
    logger.info('Context: %s', context)
    logger.info('Event summary: %s', build_event_log(event))

    headers = {
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
    }

    try:
        if 'OPTIONS' == event.get('httpMethod'):
            return HttpResponseFactory.create(200, {}, headers)

        require_editor_role(event)

        try:
            if isinstance(event.get('body'), str):
                body = json.loads(event.get('body', '{}'))
            else:
                body = event.get('body', {})
        except json.JSONDecodeError:
            return HttpResponseFactory.create(
                400,
                {
                    'error': 'Bad Request',
                    'message': 'Invalid JSON in request body'
                },
                headers
            )

        required_fields = ['date', 'name', 'configuration_type']
        missing_fields = [field for field in required_fields if field not in body or not body[field]]
        
        if missing_fields:
            return HttpResponseFactory.create(
                400,
                {
                    'error': 'Bad Request',
                    'message': f'Missing required fields: {", ".join(missing_fields)}'
                },
                headers
            )

        try:
            ConfigurationType(body['configuration_type'])
        except ValueError:
            return HttpResponseFactory.create(
                400,
                {
                    'error': 'Bad Request',
                    'message': f'Invalid configuration_type: {body["configuration_type"]}'
                },
                headers
            )

        dynamoDbClient = DynamoDbClient.create(
            os.environ.get('AWS_DYNAMODB_REGION', ''),
            os.environ.get('AWS_DYNAMODB_URI', '')
        )

        holidayCalendarService = HolidayCalendarService(
            dynamoDbClient.Table(os.environ.get('AWS_DYNAMODB_TABLE_NAME', ''))
        )

        existing = holidayCalendarService.getByDate(body['date'])
        if existing:
            return HttpResponseFactory.create(
                409,
                {
                    'error': 'Conflict',
                    'message': f'Holiday with date {body["date"]} already exists'
                },
                headers
            )

        holiday = HolidayCalendar(
            date=body['date'],
            name=body['name'],
            description=body.get('description', ''),
            configurationType=ConfigurationType(body['configuration_type']),
            queue_overrides=body.get('queue_overrides', {})
        )

        created_holiday = holidayCalendarService.create(holiday)

        return HttpResponseFactory.create(
            201,
            created_holiday.toDict(),
            headers
        )

    except PermissionError:
        return HttpResponseFactory.create(
            403,
            {
                'error': 'Forbidden',
                'message': 'Editor role required to create holiday calendar entries.'
            },
            headers
        )

    except ValueError as e:
        error_message = str(e)
        logger.error(f'Validation error in `create_holiday_calendar`: "{error_message}".')

        return HttpResponseFactory.create(
            400,
            {
                'error': 'Bad Request',
                'message': error_message
            },
            headers
        )

    except Exception as e:
        logger.error(f'Error in `create_holiday_calendar`: "{str(e)}".')

        return HttpResponseFactory.create(
            500,
            {
                'error': 'Internal server error',
                'message': 'Failed to create holiday calendar entry.'
            },
            headers
        )

