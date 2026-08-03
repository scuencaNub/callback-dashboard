#
# This file is part of Nubity Python Skeleton.
#
# (c) Nubity Inc. <esa@nubity.com>.
#
# This source file is subject to a proprietary license that is bundled
# with this source code in the file LICENSE.
#

from typing import Any, Dict

from holiday_calendar.model.configuration_type import ConfigurationType


class HolidayCalendar:
    """Represent a holiday calendar entry."""

    def __init__(
        self,
        date: str,
        name: str,
        description: str,
        configurationType: ConfigurationType,
        queue_overrides: Dict[str, Any] = {}

    ):
        self.date = date
        self.name = name
        self.description = description
        self.configurationType = configurationType
        self.queue_overrides = queue_overrides or {}
    def toDict(self) -> Dict[str, Any]:
        """Convert `HolidayCalendar` to a dictionary."""
        return {
            'date': self.date,
            'name': self.name,
            'description': self.description,
            'configuration_type': self.configurationType.value,
            'queue_overrides': [
                {
                    'queue_name': queue_name,
                    **override_data
                }
                for queue_name, override_data in self.queue_overrides.items()
            ]        
        }

    @classmethod
    def fromDict(cls, data: Dict[str, Any]) -> 'HolidayCalendar':
        """Convert a dictionary to a `HolidayCalendar`."""
        return cls(
            date=data['date'],
            name=data['name'],
            description=data['description'],
            configurationType=ConfigurationType(data['configuration_type']),
            queue_overrides=data.get('queue_overrides', {})
        )

