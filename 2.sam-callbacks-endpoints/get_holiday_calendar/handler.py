#
# This file is part of Nubity Python Skeleton.
#
# (c) Nubity Inc. <esa@nubity.com>.
#
# This source file is subject to a proprietary license that is bundled
# with this source code in the file LICENSE.
#

import logging
import os
from typing import Any, Dict

from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

from api_rest.http_response_factory import HttpResponseFactory
from api_rest.log import build_event_log
from api_rest.model_list_serializer import ModelListSerializer
from client.dynamo_db_client import DynamoDbClient
from holiday_calendar.holiday_calendar_service import HolidayCalendarService

logger: Logger = Logger()
logger.setLevel(logging.INFO)


def lambda_handler(event: Dict[str, Any], context: LambdaContext) -> Dict[str, Any]:
    logger.info('Context: %s', context)
    logger.info('Event summary: %s', build_event_log(event))

    headers = {
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
    }

    try:
       
        if 'OPTIONS' == event.get('httpMethod'):
            return HttpResponseFactory.create(200, {}, headers)

        dynamoDbClient = DynamoDbClient.create(
            os.environ.get('AWS_DYNAMODB_REGION', ''),
            os.environ.get('AWS_DYNAMODB_URI', '')
        )

        holidayCalendarService = HolidayCalendarService(
            dynamoDbClient.Table(os.environ.get('AWS_DYNAMODB_TABLE_NAME', ''))
        )

        holidays = holidayCalendarService.getAllHolidays()

        if holidays:
            return HttpResponseFactory.create(
                200,
                ModelListSerializer.serialize(holidays),
                headers
            )

        return HttpResponseFactory.create(
            404,
            {'error': 'Holidays calendars not found.'},
            headers
        )
    except Exception as e:
        logger.error(f'Error in `get_holiday_calendar`: "{str(e)}".')

        return HttpResponseFactory.create(
            500,
            {
                'error': 'Internal server error',
                'message': 'Failed to retrieve holiday calendars.'
            },
            headers
        )

