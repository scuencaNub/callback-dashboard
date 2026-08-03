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
from urllib.parse import unquote

from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

from api_rest.editor_authorization import require_editor_role
from api_rest.http_response_factory import HttpResponseFactory
from api_rest.log import build_event_log
from client.dynamo_db_client import DynamoDbClient
from queue_configuration.queue_configuration_service import QueueConfigurationService

logger: Logger = Logger()
logger.setLevel(logging.INFO)


def lambda_handler(event: Dict[str, Any], context: LambdaContext) -> Dict[str, Any]:
    """
    Update a queue configuration entry.

    HTTP Method: PUT
    Path: /queue-configurations/{queue_id}
    """
    logger.info('Context: %s', context)
    logger.info('Event summary: %s', build_event_log(event))

    headers = {
        'Access-Control-Allow-Methods': 'PUT,OPTIONS'
    }

    try:
        
        if 'OPTIONS' == event.get('httpMethod'):
            # Return CORS headers for preflight request
            return HttpResponseFactory.create(200, {}, headers)

        require_editor_role(event)

        # Get queue_name from path parameters and decode it (URL decode)
        path_parameters = event.get('pathParameters') or {}
        queue_name = path_parameters.get('queue_name')

        if not queue_name:
            return HttpResponseFactory.create(
                400,
                {
                    'error': 'Bad Request',
                    'message': 'queue_name is required in path parameters'
                },
                headers
            )

        # Decode URL-encoded queue_name
        queue_name = unquote(queue_name)
        logger.info(f'Looking for queue with name: {queue_name}')

        
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

        
        dynamoDbClient = DynamoDbClient.create(
            os.environ.get('AWS_DYNAMODB_REGION', ''),
            os.environ.get('AWS_DYNAMODB_URI', '')
        )

        queueConfigurationService = QueueConfigurationService(
            dynamoDbClient.Table(os.environ.get('AWS_DYNAMODB_TABLE_NAME', ''))
        )

        # Find queue by name to get queue_id
        logger.info(f'Searching for queue configuration with name: {queue_name}')
        queue_config = queueConfigurationService.getByQueueName(queue_name)
        if not queue_config:
            logger.warning(f'Queue configuration not found for name: {queue_name}')
            return HttpResponseFactory.create(
                404,
                {
                    'error': 'Not Found',
                    'message': f'Queue configuration with queue_name "{queue_name}" not found'
                },
                headers
            )

        logger.info(f'Found queue configuration with queue_id: {queue_config.queueId}')
        logger.info(f'Updating with payload: {json.dumps(body)}')

        # Update the record using queue_id
        updated_queue = queueConfigurationService.update(queue_config.queueId, body)
        logger.info(f'Successfully updated queue configuration')

        return HttpResponseFactory.create(
            200,
            updated_queue.toDict(),
            headers
        )

    except PermissionError:
        return HttpResponseFactory.create(
            403,
            {
                'error': 'Forbidden',
                'message': 'Editor role required to update queue configurations.'
            },
            headers
        )

    except ValueError as e:
        error_message = str(e)
        logger.error(f'Validation error in `update_queue_configuration`: "{error_message}".')

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
        logger.error(f'Error in `update_queue_configuration`: "{error_message}".')
        logger.error(f'Traceback: {error_traceback}')

        return HttpResponseFactory.create(
            500,
            {
                'error': 'Internal server error',
                'message': 'Failed to update queue configuration.'
            },
            headers
        )

