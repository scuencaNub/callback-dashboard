#
# This file is part of Nubity Python Skeleton.
#
# (c) Nubity Inc. <esa@nubity.com>.
#
# This source file is subject to a proprietary license that is bundled
# with this source code in the file LICENSE.
#
import json
import os
from typing import Any, Dict

from api_rest.decimal_encoder import DecimalEncoder


class HttpResponseFactory:
    """Create HTTP response."""

    @staticmethod
    def create(
        statusCode: int,
        body: Any,
        headers: Dict[str, str] | None = None,
    ) -> Dict[str, Any]:
        """Create HTTP response."""
        defaultHeaders = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': os.environ.get('CORS_ALLOWED_ORIGIN', '*'),
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        }

        if headers:
            defaultHeaders.update(headers)

        return {
            'statusCode': statusCode,
            'headers': defaultHeaders,
            'body': json.dumps(body, ensure_ascii=False, cls=DecimalEncoder)
        }

