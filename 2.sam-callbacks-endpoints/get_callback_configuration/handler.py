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

from callback_configuration.model.callback_configuration import CallbackConfiguration
from api_rest.log import build_event_log
from client.simple_systems_manager_client import SimpleSystemsManagerClient

logger: Logger = Logger()
logger.setLevel(logging.INFO)


def lambda_handler(event: Dict[str, Any], context: LambdaContext) -> Dict[str, Any]:
    logger.info('Event summary: %s', build_event_log(event))
    logger.info('Context: %s', context)
    cors_allowed_origin = os.environ.get('CORS_ALLOWED_ORIGIN', '*')

    if 'OPTIONS' == event.get('httpMethod'):
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': cors_allowed_origin,
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
            },
            'body': json.dumps({})
        }

    simpleSystemsManagerClient = SimpleSystemsManagerClient.create()

    parameter = simpleSystemsManagerClient.get_parameter(
        Name=os.environ.get('PARAMETER_NAME', ''),
    )

    callbackConfiguration = CallbackConfiguration.fromDict(
        json.loads(
            parameter.get('Parameter', {}).get('Value', '{}')
        )
    )

    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': cors_allowed_origin,
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
        },
        'body': json.dumps(callbackConfiguration.toDict())
    }
