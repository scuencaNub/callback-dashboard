#
# This file is part of Nubity Python Skeleton.
#
# (c) Nubity Inc. <esa@nubity.com>.
#
# This source file is subject to a proprietary license that is bundled
# with this source code in the file LICENSE.
#

from enum import Enum


class ConfigurationType(Enum):
    """Configuration type for holiday calendar."""

    COMPLETELY_DISABLE_CALLBACKS = "Completely disable callbacks"
    ONLY_ALLOW_SCHEDULED_CALLBACKS = "Only allow scheduled callbacks"
    PARTIAL_OPERATION = "Partial operation"

