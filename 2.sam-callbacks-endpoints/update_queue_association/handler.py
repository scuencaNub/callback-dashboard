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
from queue_association.queue_association_service import QueueAssociationService

logger: Logger = Logger()
logger.setLevel(logging.INFO)


def lambda_handler(event: Dict[str, Any], context: LambdaContext) -> Dict[str, Any]:
    """
    Update the `force_callback_enable` flag for a single queue association entry.

    The primary key of `TableQueueAssociation` is `queue_arn` (there is no index),
    so the target record is identified by `queue_arn` in the request body rather than
    in the path, avoiding URL-encoding an ARN.

    HTTP Method: PUT
    Path: /queue-associations
    Body: {"queue_arn": "...", "force_callback_enable": true}
    """
    logger.info('Context: %s', context)
    logger.info('Event summary: %s', build_event_log(event))

    headers = {
        'Access-Control-Allow-Methods': 'PUT,OPTIONS'
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

        if not body:
            return HttpResponseFactory.create(
                400,
                {
                    'error': 'Bad Request',
                    'message': 'Request body is required'
                },
                headers
            )

        queue_arn = body.get('queue_arn')
        force_callback_enable = body.get('force_callback_enable')

        if not queue_arn:
            return HttpResponseFactory.create(
                400,
                {
                    'error': 'Bad Request',
                    'message': 'queue_arn is required in the request body'
                },
                headers
            )

        if not isinstance(force_callback_enable, bool):
            return HttpResponseFactory.create(
                400,
                {
                    'error': 'Bad Request',
                    'message': 'force_callback_enable is required and must be a boolean'
                },
                headers
            )

        dynamoDbClient = DynamoDbClient.create(
            os.environ.get('AWS_DYNAMODB_REGION', ''),
            os.environ.get('AWS_DYNAMODB_URI', '')
        )

        queueAssociationService = QueueAssociationService(
            dynamoDbClient.Table(os.environ.get('AWS_DYNAMODB_QUEUE_ASSOCIATION_TABLE_NAME', ''))
        )

        logger.info(f'Updating force_callback_enable={force_callback_enable} for queue_arn: {queue_arn}')

        updated_association = queueAssociationService.updateForceCallbackEnable(queue_arn, force_callback_enable)

        return HttpResponseFactory.create(
            200,
            updated_association.toDict(),
            headers
        )

    except PermissionError:
        return HttpResponseFactory.create(
            403,
            {
                'error': 'Forbidden',
                'message': 'Editor role required to update queue associations.'
            },
            headers
        )

    except ValueError as e:
        error_message = str(e)
        logger.error(f'Validation error in `update_queue_association`: "{error_message}".')

        status_code = 404 if 'not found' in error_message.lower() else 400

        return HttpResponseFactory.create(
            status_code,
            {
                'error': 'Bad Request' if status_code == 400 else 'Not Found',
                'message': error_message
            },
            headers
        )

    except Exception as e:
        import traceback
        error_message = str(e)
        error_traceback = traceback.format_exc()
        logger.error(f'Error in `update_queue_association`: "{error_message}".')
        logger.error(f'Traceback: {error_traceback}')

        return HttpResponseFactory.create(
            500,
            {
                'error': 'Internal server error',
                'message': 'Failed to update queue association.'
            },
            headers
        )
