#
# This file is part of Nubity Python Skeleton.
#
# (c) Nubity Inc. <esa@nubity.com>.
#
# This source file is subject to a proprietary license that is bundled
# with this source code in the file LICENSE.
#

import datetime

from callback_configuration.model.callback_configuration import CallbackConfiguration
from parameter_status.ssm_service import SsmService


class CallbackConfigurationService:


    @staticmethod
    def isActive(callbackConfiguration: CallbackConfiguration, date: datetime.datetime) -> bool:

        scheduleProgramming = SsmService.getTodaySchedule(callbackConfiguration, date)

        if None is scheduleProgramming or not scheduleProgramming.status:
            return False

        if not scheduleProgramming.startAt or not scheduleProgramming.endAt:
            return False

        startTime = datetime.datetime.strptime(scheduleProgramming.startAt, '%H:%M').time()

        endTime = datetime.datetime.strptime(scheduleProgramming.endAt, '%H:%M').time()

        return startTime <= datetime.time(date.hour, date.minute) <= endTime
