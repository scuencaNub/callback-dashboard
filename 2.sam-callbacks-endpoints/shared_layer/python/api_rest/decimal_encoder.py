#
# This file is part of Nubity Python Skeleton.
#
# (c) Nubity Inc. <esa@nubity.com>.
#
# This source file is subject to a proprietary license that is bundled
# with this source code in the file LICENSE.
#
import json
from decimal import Decimal
from typing import Any


class DecimalEncoder(json.JSONEncoder):
    """Custom JSON encoder for `Decimal` objects."""

    def default(self, o: Any) -> Any:
        """Encode `Decimal` objects into `int` or `float` values."""
        if isinstance(o, Decimal):
            return int(o) if o % 1 == 0 else float(o)

        return super().default(o)

