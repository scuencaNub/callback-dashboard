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
from callback_configuration.model.callback_configuration import CallbackConfiguration
from client.simple_systems_manager_client import SimpleSystemsManagerClient

logger: Logger = Logger()
logger.setLevel(logging.INFO)


def lambda_handler(event: Dict[str, Any], context: LambdaContext) -> Dict[str, Any]:
    """
    Update the callback configuration parameter in SSM Parameter Store.

    HTTP Method: PUT
    Path: /callback-configuration
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

        
        try:
            callbackConfiguration = CallbackConfiguration.fromDict(body)
        except (KeyError, ValueError) as e:
            return HttpResponseFactory.create(
                400,
                {
                    'error': 'Bad Request',
                    'message': f'Invalid configuration data: {str(e)}'
                },
                headers
            )

        
        parameter_name = os.environ.get('PARAMETER_NAME', '')
        if not parameter_name:
            return HttpResponseFactory.create(
                500,
                {
                    'error': 'Internal Server Error',
                    'message': 'PARAMETER_NAME environment variable is not set'
                },
                headers
            )

        
        simpleSystemsManagerClient = SimpleSystemsManagerClient.create()

        
        simpleSystemsManagerClient.put_parameter(
            Name=parameter_name,
            Value=json.dumps(callbackConfiguration.toDict()),
            Type='String',
            Overwrite=True
        )

        logger.info(f'Successfully updated parameter: {parameter_name}')

        return HttpResponseFactory.create(
            200,
            {
                'message': 'Callback configuration updated successfully',
                'configuration': callbackConfiguration.toDict()
            },
            headers
        )

    except PermissionError:
        return HttpResponseFactory.create(
            403,
            {
                'error': 'Forbidden',
                'message': 'Editor role required to update callback configuration.'
            },
            headers
        )

    except Exception as e:
        logger.error(f'Error in `update_callback_configuration`: "{str(e)}".')

        return HttpResponseFactory.create(
            500,
            {
                'error': 'Internal server error',
                'message': 'Failed to update callback configuration.'
            },
            headers
        )

