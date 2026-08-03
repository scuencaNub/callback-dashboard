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
from calls_in_system.calls_in_system_service import CallsInSystemService

logger: Logger = Logger()
logger.setLevel(logging.INFO)


def lambda_handler(event: Dict[str, Any], context: LambdaContext) -> Dict[str, Any]:
    """
    Update a CallsInSystem record.

    HTTP Method: PUT
    Path: /calls-in-system/{contact_id_inbound}
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
        contact_id_inbound = path_parameters.get('contact_id_inbound')

        if not contact_id_inbound:
            return HttpResponseFactory.create(
                400,
                {
                    'error': 'Bad Request',
                    'message': 'contact_id_inbound is required in path parameters'
                },
                headers
            )

        
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

        # Get current call_at from body (required for sort key)
        # If call_at is being updated, we need the original value in the Key
        # and the new value in update_fields
        current_call_at = body.get('current_call_at') or body.get('call_at')
        
        if not current_call_at:
            return HttpResponseFactory.create(
                400,
                {
                    'error': 'Bad Request',
                    'message': 'call_at (or current_call_at) is required in request body to identify the record'
                },
                headers
            )

        # Remove current_call_at from update_fields if present (it's only for identification)
        update_fields = {k: v for k, v in body.items() if k != 'current_call_at'}

        
        dynamoDbClient = DynamoDbClient.create(
            os.environ.get('DYNAMODB_REGION', ''),
            os.environ.get('DYNAMODB_URI', '')
        )

        callsInSystemService = CallsInSystemService(
            dynamoDbClient.Table(os.environ.get('DYNAMODB_TABLE_NAME', ''))
        )

        # Update the record (use current_call_at as the sort key)
        updated_call = callsInSystemService.update(contact_id_inbound, current_call_at, update_fields)

        return HttpResponseFactory.create(
            200,
            updated_call.toDict(),
            headers
        )

    except PermissionError:
        return HttpResponseFactory.create(
            403,
            {
                'error': 'Forbidden',
                'message': 'Editor role required to update calls in system.'
            },
            headers
        )

    except ValueError as e:
        error_message = str(e)
        logger.error(f'Validation error in `update_calls_in_system`: "{error_message}".')

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
        logger.error(f'Error in `update_calls_in_system`: "{str(e)}".')

        return HttpResponseFactory.create(
            500,
            {
                'error': 'Internal server error',
                'message': 'Failed to update call in system.'
            },
            headers
        )

