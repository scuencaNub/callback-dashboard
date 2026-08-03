#
# This file is part of Nubity Python Skeleton.
#
# (c) Nubity Inc. <esa@nubity.com>.
#
# This source file is subject to a proprietary license that is bundled
# with this source code in the file LICENSE.
#

from typing import Any, Dict


class ActiveContact:
    """A row from ActiveContactsInFlow (single source of truth for the
    concurrency panel).

    - start_timestamp: '2026-07-16T14:07:21-0400' (already Puerto Rico
      local time, fixed -0400 offset, no DST) -> used for the 15-min slot
    - callback_already_offered: 'true' -> offered
    - outcome: 'registered' | 'enqueued' | '' (empty counts as neither)
    - selected_callback_type: 'ASAP' | 'SCHEDULE' | '' (empty -> unset,
      a valid business state: customer routed to queue without offer)
    """

    def __init__(
        self,
        contactId: str,
        queueName: str,
        startTimestamp: str,
        callbackAlreadyOffered: bool = False,
        outcome: str = '',
        selectedCallbackType: str = '',
    ):
        self.contactId = contactId
        self.queueName = queueName
        self.startTimestamp = startTimestamp
        self.callbackAlreadyOffered = callbackAlreadyOffered
        self.outcome = outcome
        self.selectedCallbackType = selectedCallbackType

    @classmethod
    def fromDict(cls, data: Dict[str, Any]) -> 'ActiveContact':
        offeredRaw = data.get('callback_already_offered', False)
        if isinstance(offeredRaw, str):
            offered = offeredRaw.strip().lower() == 'true'
        else:
            offered = bool(offeredRaw)

        return cls(
            contactId=data.get('contact_id', '') or '',
            queueName=data.get('queue_name', '') or '',
            startTimestamp=data.get('start_timestamp', '') or '',
            callbackAlreadyOffered=offered,
            outcome=(data.get('outcome', '') or '').strip().lower(),
            selectedCallbackType=(data.get('selected_callback_type', '') or '').strip().upper(),
        )
