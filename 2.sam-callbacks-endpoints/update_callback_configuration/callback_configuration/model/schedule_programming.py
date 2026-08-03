#
# This file is part of Nubity Python Skeleton.
#
# (c) Nubity Inc. <esa@nubity.com>.
#
# This source file is subject to a proprietary license that is bundled
# with this source code in the file LICENSE.
#

from typing import Any, Dict

from callback_configuration.model.day import Day


class ScheduleProgramming:
    """Represent a schedule programming."""

    def __init__(
        self,
        day: Day,
        startAt: str | None,
        endAt: str | None,
        status: bool
    ):
        self.day = day
        self.startAt = startAt
        self.endAt = endAt
        self.status = status

    def toDict(self) -> Dict[str, Any]:
        """Convert `ScheduleProgramming` to a dictionary."""
        return {
            'day': self.day.value,
            'start_at': self.startAt,
            'end_at': self.endAt,
            'status': self.status
        }

    @classmethod
    def fromDict(cls, data: Dict[str, Any]) -> 'ScheduleProgramming':
        """Convert a dictionary to a `ScheduleProgramming`."""
        return cls(
            day=Day(data.get('day', '')),
            startAt=data.get('start_at'),
            endAt=data.get('end_at'),
            status=data.get('status', False)
        )
