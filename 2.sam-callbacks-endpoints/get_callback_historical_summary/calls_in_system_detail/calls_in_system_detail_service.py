#
# This file is part of Nubity Python Skeleton.
#
# (c) Nubity Inc. <esa@nubity.com>.
#
# This source file is subject to a proprietary license that is bundled
# with this source code in the file LICENSE.
#

from __future__ import annotations

import json
import logging
from typing import TYPE_CHECKING, Any, Dict, List, Tuple

from aws_lambda_powertools import Logger

if TYPE_CHECKING:
    from mypy_boto3_dynamodb.service_resource import DynamoDBServiceResource

logger: Logger = Logger()
logger.setLevel(logging.INFO)

# Hard limit of the DynamoDB BatchGetItem API.
BATCH_GET_MAX_KEYS = 100


def _normalize_timestamp(value: Any) -> Dict[str, Any]:
    """Same normalization used across the other CallsInSystem consumers:
    timestamp can be a native map or, in legacy items, a JSON string."""
    if isinstance(value, dict):
        return value
    if not value:
        return {}
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            return {'CB_REGISTERED': value}
        return {'CB_REGISTERED': value}
    return {}


class CallsInSystemDetailService:
    """Fetch full CallsInSystem records for a set of (contact_id_inbound,
    call_at) keys via BatchGetItem.

    RegistrationIndex already stores both parts of CallsInSystem's
    primary key for every entry, so this is a direct batch lookup --
    no scan, no secondary index needed.
    """

    def __init__(self, dynamoDbResource: DynamoDBServiceResource, tableName: str):
        self.dynamoDbResource = dynamoDbResource
        self.tableName = tableName

    def findByKeys(self, keys: List[Tuple[str, str]]) -> List[Dict[str, Any]]:
        """keys: list of (contact_id_inbound, call_at) tuples.

        Returns the full CallsInSystem item for each key found (missing
        keys -- e.g. a record deleted after being indexed -- are silently
        skipped). Handles pagination (UnprocessedKeys) and chunks over
        BATCH_GET_MAX_KEYS internally.
        """
        if not keys:
            return []

        # dedupe while preserving a deterministic order
        uniqueKeys = list(dict.fromkeys(keys))

        results: List[Dict[str, Any]] = []

        for chunkStart in range(0, len(uniqueKeys), BATCH_GET_MAX_KEYS):
            chunk = uniqueKeys[chunkStart:chunkStart + BATCH_GET_MAX_KEYS]
            requestKeys = [
                {'contact_id_inbound': contactId, 'call_at': callAt}
                for contactId, callAt in chunk
            ]

            requestItems = {self.tableName: {'Keys': requestKeys}}

            try:
                while requestItems:
                    response = self.dynamoDbResource.batch_get_item(RequestItems=requestItems)
                    items = response.get('Responses', {}).get(self.tableName, [])

                    for item in items:
                        item['timestamp'] = _normalize_timestamp(item.get('timestamp'))
                        results.append(item)

                    requestItems = response.get('UnprocessedKeys') or {}
            except Exception as e:
                logger.error(f'Error batch-getting CallsInSystem details: "{str(e)}".')
                raise

        return results
