#
# This file is part of Nubity Python Skeleton.
#
# (c) Nubity Inc. <esa@nubity.com>.
#
# This source file is subject to a proprietary license that is bundled
# with this source code in the file LICENSE.
#
from enum import Enum


class PriorityMode(Enum):
    """Provides the `CallbackConfiguration` priorities mode."""

    AGENT = 'AGENT'
    CUSTOMER = 'CUSTOMER'
