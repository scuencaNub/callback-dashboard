#
# This file is part of Nubity Python Skeleton.
#
# (c) Nubity Inc. <esa@nubity.com>.
#
# This source file is subject to a proprietary license that is bundled
# with this source code in the file LICENSE.
#

from typing import Any, Dict


class RegisteredCall:
    """Represent a CallsInSystem row as returned by the
    queue_name-call_at-index GSI query.

    call_at is the source of truth for slot bucketing: capacity per slot
    is defined by when the callback is scheduled to happen, not by when
    the customer registered. The GSI only projects callback_type and
    status (not the full item) -- cb_registered_at, when needed, comes
    from a separate BatchGetItem via include_details.
    """

    def __init__(
        self,
        contactIdInbound: str,
        callAt: str,
        status: str = '',
        callbackType: str = '',
    ):
        self.contactIdInbound = contactIdInbound
        self.callAt = callAt
        self.status = status
        self.callbackType = callbackType

    @classmethod
    def fromDict(cls, data: Dict[str, Any]) -> 'RegisteredCall':
        return cls(
            contactIdInbound=data.get('contact_id_inbound', '') or '',
            callAt=data.get('call_at', '') or '',
            status=data.get('status', '') or '',
            callbackType=data.get('callback_type', '') or '',
        )
