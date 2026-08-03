#
# This file is part of Nubity Python Skeleton.
#
# (c) Nubity Inc. <esa@nubity.com>.
#
# This source file is subject to a proprietary license that is bundled
# with this source code in the file LICENSE.
#

from typing import Any, Dict, List

from callback_configuration.model.day import Day
from callback_configuration.model.day_ordered import DayOrdered
from callback_configuration.model.mode import Mode
from callback_configuration.model.priority_mode import PriorityMode
from callback_configuration.model.schedule_programming import ScheduleProgramming


class CallbackConfiguration:
    """Represent a callback configuration."""

    __START_AT_DEFAULT = '08:00'

    __END_AT_DEFAULT = '18:00'

    def __init__(
        self,
        status: bool,
        mode: Mode,
        activationThreshold: int,
        deactivationThreshold: int,
        priorityMode: PriorityMode,
        scheduleProgramming: List[ScheduleProgramming]
    ):
        self.status = status
        self.mode = mode
        self.activationThreshold = activationThreshold
        self.deactivationThreshold = deactivationThreshold
        self.priorityMode = priorityMode

        self.scheduleProgramming = [
            ScheduleProgramming(Day.MONDAY, self.__START_AT_DEFAULT, self.__END_AT_DEFAULT, False),
            ScheduleProgramming(Day.TUESDAY, self.__START_AT_DEFAULT, self.__END_AT_DEFAULT, False),
            ScheduleProgramming(Day.WEDNESDAY, self.__START_AT_DEFAULT, self.__END_AT_DEFAULT, False),
            ScheduleProgramming(Day.THURSDAY, self.__START_AT_DEFAULT, self.__END_AT_DEFAULT, False),
            ScheduleProgramming(Day.FRIDAY, self.__START_AT_DEFAULT, self.__END_AT_DEFAULT, False),
            ScheduleProgramming(Day.SATURDAY, self.__START_AT_DEFAULT, self.__END_AT_DEFAULT, False),
            ScheduleProgramming(Day.SUNDAY, self.__START_AT_DEFAULT, self.__END_AT_DEFAULT, False),
        ]

        for schedule in scheduleProgramming:
            self.addScheduleProgramming(schedule)

    def addScheduleProgramming(self, scheduleProgramming: ScheduleProgramming) -> None:
        """Add a `ScheduleProgramming` to the list."""
        self.scheduleProgramming[DayOrdered[scheduleProgramming.day.name].value] = scheduleProgramming

    def toDict(self) -> Dict[str, Any]:
        """Convert `CallbackConfiguration` to a dictionary."""
        return {
            'status': self.status,
            'mode': self.mode.value,
            'activation_threshold': self.activationThreshold,
            'deactivation_threshold': self.deactivationThreshold,
            'priority_mode': self.priorityMode.value,
            'schedule_programming': list(
                map(ScheduleProgramming.toDict, self.scheduleProgramming)
            )
        }

    @classmethod
    def fromDict(cls, data: Dict[str, Any]) -> 'CallbackConfiguration':
        """Convert a dictionary to a `CallbackConfiguration`."""
        return cls(
            status=data.get('status', False),
            mode=Mode(data['mode']),
            activationThreshold=data.get('activation_threshold', 0),
            deactivationThreshold=data.get('deactivation_threshold', 0),
            priorityMode=PriorityMode(data.get('priority_mode', PriorityMode.CUSTOMER.value)),
            scheduleProgramming=list(
                map(ScheduleProgramming.fromDict, data.get('schedule_programming', []))
            )
        )
