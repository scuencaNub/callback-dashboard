#
# This file is part of Nubity Python Skeleton.
#
# (c) Nubity Inc. <esa@nubity.com>.
#
# This source file is subject to a proprietary license that is bundled
# with this source code in the file LICENSE.
#
from enum import Enum


class CallbackType(Enum):
    """Provides the `QueueConfiguration` types."""

    NOT_ALLOW_SCHEDULING = 'NOT_ALLOW_SCHEDULING'
    ALLOW_SCHEDULING = 'ALLOW_SCHEDULING'

