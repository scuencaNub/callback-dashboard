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
from client.dynamo_db_client import DynamoDbClient
from queue_association.queue_association_service import QueueAssociationService

logger: Logger = Logger()
logger.setLevel(logging.INFO)


def lambda_handler(event: Dict[str, Any], context: LambdaContext) -> Dict[str, Any]:
    """
    Get all queue associations (entry queue -> callback queue mapping),
    including the `force_callback_enable` flag per entry queue.

    HTTP Method: GET
    Path: /queue-associations
    """
    logger.info('Context: %s', context)
    logger.info('Event summary: %s', build_event_log(event))

    headers = {
        'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS'
    }

    try:
        if 'OPTIONS' == event.get('httpMethod'):
            return HttpResponseFactory.create(200, {}, headers)

        dynamoDbClient = DynamoDbClient.create(
            os.environ.get('AWS_DYNAMODB_REGION', ''),
            os.environ.get('AWS_DYNAMODB_URI', '')
        )

        queueAssociationService = QueueAssociationService(
            dynamoDbClient.Table(os.environ.get('AWS_DYNAMODB_QUEUE_ASSOCIATION_TABLE_NAME', ''))
        )

        associations = queueAssociationService.findAll()

        items = [association.toDict() for association in associations]

        return HttpResponseFactory.create(
            200,
            {
                'items': items,
                'count': len(items),
            },
            headers
        )
    except Exception as e:
        logger.error(f'Error in `get_queue_associations`: "{str(e)}".')

        return HttpResponseFactory.create(
            500,
            {
                'error': 'Internal server error',
                'message': 'Failed to retrieve queue associations.'
            },
            headers
        )
