import logging
import os
from typing import Any, Dict

from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

from api_rest.http_response_factory import HttpResponseFactory
from api_rest.log import build_event_log
from client.dynamo_db_client import DynamoDbClient
from queue_group_info.queue_group_info_service import QueueGroupInfoService

logger: Logger = Logger()
logger.setLevel(logging.INFO)


def lambda_handler(event: Dict[str, Any], context: LambdaContext) -> Dict[str, Any]:
    """
    Get all queue group info entries.

    HTTP Method: GET
    Path: /queue-group-info
    """
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

        service = QueueGroupInfoService(
            dynamoDbClient.Table(os.environ.get('AWS_DYNAMODB_TABLE_NAME', ''))
        )

        items = service.findAll()

        return HttpResponseFactory.create(
            200,
            {
                'items': [item.toDict() for item in items],
                'count': len(items),
            },
            headers
        )
    except Exception as e:
        logger.error(f'Error in `get_queue_group_info`: "{str(e)}".')

        return HttpResponseFactory.create(
            500,
            {
                'error': 'Internal server error',
                'message': 'Failed to retrieve queue group info.'
            },
            headers
        )
