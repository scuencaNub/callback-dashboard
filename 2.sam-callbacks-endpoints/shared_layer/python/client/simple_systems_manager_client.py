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

if TYPE_CHECKING:
    from mypy_boto3_ssm.client import SSMClient


class SimpleSystemsManagerClient:
    """Provide an Amazon Simple Systems Manager (SSM) client."""

    @staticmethod
    def create() -> "SSMClient":
        """Create an Amazon Simple Systems Manager (SSM) client."""
        return boto3.client('ssm')
