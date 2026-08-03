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
from queue_group_info.queue_group_info import VALID_BEHAVIORS
from queue_group_info.queue_group_info_service import QueueGroupInfoService

logger: Logger = Logger()
logger.setLevel(logging.INFO)


def lambda_handler(event: Dict[str, Any], context: LambdaContext) -> Dict[str, Any]:
    """
    Update after_threshold_behavior for a queue group.

    HTTP Method: PUT
    Path: /queue-group-info/{queue_group_name}
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

        path_parameters = event.get('pathParameters') or {}
        queue_group_name = path_parameters.get('queue_group_name')

        if not queue_group_name:
            return HttpResponseFactory.create(
                400,
                {'error': 'Bad Request', 'message': 'queue_group_name is required in path parameters'},
                headers
            )

        queue_group_name = unquote(queue_group_name)
        logger.info(f'Updating queue group: {queue_group_name}')

        try:
            body = json.loads(event.get('body') or '{}') if isinstance(event.get('body'), str) else (event.get('body') or {})
        except json.JSONDecodeError:
            return HttpResponseFactory.create(
                400,
                {'error': 'Bad Request', 'message': 'Invalid JSON in request body'},
                headers
            )

        after_threshold_behavior = body.get('after_threshold_behavior')

        if not after_threshold_behavior:
            return HttpResponseFactory.create(
                400,
                {'error': 'Bad Request', 'message': 'after_threshold_behavior is required'},
                headers
            )

        if after_threshold_behavior not in VALID_BEHAVIORS:
            return HttpResponseFactory.create(
                400,
                {'error': 'Bad Request', 'message': f'after_threshold_behavior must be one of: {", ".join(sorted(VALID_BEHAVIORS))}'},
                headers
            )

        dynamoDbClient = DynamoDbClient.create(
            os.environ.get('AWS_DYNAMODB_REGION', ''),
            os.environ.get('AWS_DYNAMODB_URI', '')
        )

        service = QueueGroupInfoService(
            dynamoDbClient.Table(os.environ.get('AWS_DYNAMODB_TABLE_NAME', ''))
        )

        updated = service.update(queue_group_name, after_threshold_behavior)

        if not updated:
            return HttpResponseFactory.create(
                404,
                {'error': 'Not Found', 'message': f'Queue group "{queue_group_name}" not found'},
                headers
            )

        return HttpResponseFactory.create(200, updated.toDict(), headers)

    except PermissionError:
        return HttpResponseFactory.create(
            403,
            {'error': 'Forbidden', 'message': 'Editor role required to update queue group info.'},
            headers
        )

    except Exception as e:
        logger.error(f'Error in `update_queue_group_info`: "{str(e)}".')
        return HttpResponseFactory.create(
            500,
            {'error': 'Internal server error', 'message': 'Failed to update queue group info.'},
            headers
        )
