#
# This file is part of Nubity Python Skeleton.
#
# (c) Nubity Inc. <esa@nubity.com>.
#
# This source file is subject to a proprietary license that is bundled
# with this source code in the file LICENSE.
#
from enum import Enum


class Mode(Enum):
    """Provides the `CallbackConfiguration` modes."""

    AUTOMATIC = "AUTOMATIC"
    MANUAL = "MANUAL"
