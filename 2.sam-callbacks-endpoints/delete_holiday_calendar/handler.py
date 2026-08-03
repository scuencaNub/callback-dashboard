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

logger: Logger = Logger()
logger.setLevel(logging.INFO)


def lambda_handler(event: Dict[str, Any], context: LambdaContext) -> Dict[str, Any]:
    logger.info('Context: %s', context)
    logger.info('Event summary: %s', build_event_log(event))

    # IMPORTANT:
    # API Gateway preflight (OPTIONS) is defined once per *path*, not per method.
    # In this SAM template, OPTIONS for `/holiday-calendars/{date}` is wired to this Lambda,
    # so it must allow BOTH PUT and DELETE (otherwise the browser will block PUT with a CORS error).
    headers = {
        'Access-Control-Allow-Methods': 'PUT,DELETE,OPTIONS'
    }

    try:
        
        if 'OPTIONS' == event.get('httpMethod'):
            return HttpResponseFactory.create(200, {}, headers)

        require_editor_role(event)

        
        path_parameters = event.get('pathParameters') or {}
        date = path_parameters.get('date')

        if not date:
            return HttpResponseFactory.create(
                400,
                {
                    'error': 'Bad Request',
                    'message': 'date is required in path parameters'
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

        # Delete the record (raises ValueError if not found)
        holidayCalendarService.delete(date)

        return HttpResponseFactory.create(
            200,
            {
                'message': f"Holiday with date '{date}' deleted successfully"
            },
            headers
        )

    except PermissionError:
        return HttpResponseFactory.create(
            403,
            {
                'error': 'Forbidden',
                'message': 'Editor role required to delete holiday calendar entries.'
            },
            headers
        )

    except ValueError as e:
        error_message = str(e)
        logger.error(f'Validation error in `delete_holiday_calendar`: "{error_message}".')

        return HttpResponseFactory.create(
            404,
            {
                'error': 'Not Found',
                'message': error_message
            },
            headers
        )

    except Exception as e:
        logger.error(f'Error in `delete_holiday_calendar`: "{str(e)}".')

        return HttpResponseFactory.create(
            500,
            {
                'error': 'Internal server error',
                'message': 'Failed to delete holiday calendar entry.'
            },
            headers
        )


