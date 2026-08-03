#
# This file is part of Nubity Python Skeleton.
#
# (c) Nubity Inc. <esa@nubity.com>.
#
# This source file is subject to a proprietary license that is bundled
# with this source code in the file LICENSE.
#

from typing import Any, Dict

from queue_configuration.model.callback_type import CallbackType


class QueueConfiguration:
    """Represent a `QueueConfiguration`."""

    def __init__(
        self,
        queueId: str,
        queueName: str,
        maxRetryAttempts: int,
        retryAttemptInterval: int,
        stopOnVoicemail: bool,
        stopTimeAsapEnable: bool | None,
        businessHoursEnable: bool | None,
        startTimeAsap: str | None,
        stopTimeAsap: str | None,
        ewtMaxMinutesEnable: bool | None,
        ewtMaxMinutes: int | None,
        allowedCallbackType: CallbackType,
        allowOnlyNextDay: bool,
        businessHoursCustomMessage: str,
        phoneNumberForClient: int,
        outboundPhoneNumber: str,
        flowArn: str
    ):
        self.queueId = queueId
        self.queueName = queueName
        self.maxRetryAttempts = maxRetryAttempts
        self.retryAttemptInterval = retryAttemptInterval
        self.stopOnVoicemail = stopOnVoicemail
        self.businessHoursEnable = businessHoursEnable
        self.stopTimeAsapEnable = stopTimeAsapEnable
        self.startTimeAsap = startTimeAsap
        self.stopTimeAsap = stopTimeAsap
        self.ewtMaxMinutesEnable = ewtMaxMinutesEnable
        self.ewtMaxMinutes = ewtMaxMinutes
        self.allowedCallbackType = allowedCallbackType
        self.allowOnlyNextDay = allowOnlyNextDay
        self.businessHoursCustomMessage = businessHoursCustomMessage
        self.phoneNumberForClient = phoneNumberForClient
        self.outboundPhoneNumber = outboundPhoneNumber
        self.flowArn = flowArn

    def toDict(self) -> Dict[str, Any]:
        """Convert `QueueConfiguration` to a dictionary."""
        return {
            'queue_id': self.queueId,
            'queue_name': self.queueName,
            'max_retry_attempts': self.maxRetryAttempts,
            'retry_attempt_interval': self.retryAttemptInterval,
            'stop_on_voicemail': self.stopOnVoicemail,
            'business_hours_enable': self.businessHoursEnable,
            'stop_time_asap_enable': self.stopTimeAsapEnable,
            'start_time_asap': self.startTimeAsap,
            'stop_time_asap': self.stopTimeAsap,
            'ewt_max_minutes_enable': self.ewtMaxMinutesEnable,
            'ewt_max_minutes': self.ewtMaxMinutes,
            'allowed_callback_type': self.allowedCallbackType.value,
            'allow_only_next_day': self.allowOnlyNextDay,
            'business_hours_custom_message': self.businessHoursCustomMessage,
            'phone_number_for_client': self.phoneNumberForClient,
            'outbound_phone_number': self.outboundPhoneNumber,
            'flow_arn': self.flowArn
        }

    @classmethod
    def fromDict(cls, data: Dict[str, Any]) -> 'QueueConfiguration':
        """Convert a dictionary to a `QueueConfiguration`."""
        return cls(
            queueId=data.get('queue_id', ''),
            queueName=data.get('queue_name', ''),
            maxRetryAttempts=data.get('max_retry_attempts', 0),
            retryAttemptInterval=data.get('retry_attempt_interval', 0),
            stopOnVoicemail=bool(data.get('stop_on_voicemail', False)),
            businessHoursEnable=bool(data.get('business_hours_enable', False)),
            stopTimeAsapEnable=bool(data.get('stop_time_asap_enable', False)),
            startTimeAsap=data.get('start_time_asap'),
            stopTimeAsap=data.get('stop_time_asap'),
            ewtMaxMinutesEnable=bool(data.get('ewt_max_minutes_enable', False)),
            ewtMaxMinutes=data.get('ewt_max_minutes', 0),
            allowedCallbackType=CallbackType(data.get('allowed_callback_type', CallbackType.NOT_ALLOW_SCHEDULING.value)),
            allowOnlyNextDay=bool(data.get('allow_only_next_day', False)),
            businessHoursCustomMessage=data.get('business_hours_custom_message', ''),
            phoneNumberForClient=data.get('phone_number_for_client', 0),
            outboundPhoneNumber=data.get('outbound_phone_number', ''),
            flowArn=data.get('flow_arn', '')
        )

