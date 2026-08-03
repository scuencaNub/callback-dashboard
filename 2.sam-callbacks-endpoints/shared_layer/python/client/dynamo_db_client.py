#
# This file is part of Nubity Python Skeleton.
#
# (c) Nubity Inc. <esa@nubity.com>.
#
# This source file is subject to a proprietary license that is bundled
# with this source code in the file LICENSE.
#
from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict

import boto3

if TYPE_CHECKING:
    from mypy_boto3_dynamodb.service_resource import DynamoDBServiceResource


class DynamoDbClient:
    """Provide a DynamoDB client."""

    @staticmethod
    def create(dynamoDbRegion: str, dynamoDbUri: str) -> "DynamoDBServiceResource":
        """Create a DynamoDB client."""
        dynamoDbParams: Dict[str, Any] = {}

        if '' != dynamoDbRegion:
            dynamoDbParams['region_name'] = dynamoDbRegion

        if '' != dynamoDbUri:
            dynamoDbParams['endpoint_url'] = dynamoDbUri

        return boto3.resource('dynamodb', **dynamoDbParams)

