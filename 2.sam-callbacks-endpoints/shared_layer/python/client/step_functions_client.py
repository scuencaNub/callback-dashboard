#
# This file is part of Nubity Python Skeleton.
#
# (c) Nubity Inc. <esa@nubity.com>.
#
# This source file is subject to a proprietary license that is bundled
# with this source code in the file LICENSE.
#
from __future__ import annotations

from typing import TYPE_CHECKING

import boto3
from botocore.config import Config

if TYPE_CHECKING:
    from mypy_boto3_stepfunctions.client import SFNClient


class StepFunctionsClient:
    """Provide an AWS Step Functions client."""

    @staticmethod
    def create() -> "SFNClient":
        """Create an AWS Step Functions client."""
        return boto3.client(
            'stepfunctions',
            config=Config(
                connect_timeout=2,
                read_timeout=3,
                retries={
                    'max_attempts': 2
                }
            )
        )
