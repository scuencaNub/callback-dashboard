#
# This file is part of Nubity Python Skeleton.
#
# (c) Nubity Inc. <esa@nubity.com>.
#
# This source file is subject to a proprietary license that is bundled
# with this source code in the file LICENSE.
#
import json
from typing import Any, Dict

from calls_in_system.model.status import Status


def normalize_timestamp(value: Any) -> Dict[str, Any]:
    """Convierte cualquier formato de timestamp a dict."""
    if isinstance(value, dict):
        return value
    if not value:  # None o string vacío
        return {}
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            return {"CB_REGISTERED": value}
        return {"CB_REGISTERED": value}
    return {}


class CallsInSystem:
    """Represent a call in the system."""

    def __init__(
        self,
        contactIdInbound: str,
        customerPhoneNumber: str,
        callAt: str,
        status: Status,
        queueName: str = '',
        queueId: str = '',
        retries: int = 0,
        contactFlowId: str = '',
        outboundPhoneNumber: str = '',
        agentId: str = '',
        agentName: str = '',
        contactIdOutbound: str = '',
        retryAttemptInterval: int = 0,
        timestamp: Dict[str, Any] | None = None
    ):
        self.contactIdInbound = contactIdInbound
        self.customerPhoneNumber = customerPhoneNumber
        self.callAt = callAt
        self.status = status
        self.queueName = queueName
        self.queueId = queueId
        self.retries = retries
        self.contactFlowId = contactFlowId
        self.outboundPhoneNumber = outboundPhoneNumber
        self.agentId = agentId
        self.agentName = agentName
        self.contactIdOutbound = contactIdOutbound
        self.retryAttemptInterval = retryAttemptInterval
        self.timestamp: Dict[str, Any] = timestamp or {}

    def toDict(self) -> Dict[str, Any]:
        """Convert `CallsInSystem` to a dictionary."""
        return {
            'contact_id_inbound': self.contactIdInbound,
            'customer_phone_number': self.customerPhoneNumber,
            'call_at': self.callAt,
            'status': self.status.value,
            'queue_name': self.queueName,
            'queue_id': self.queueId,
            'retries': self.retries,
            'contact_flow_id': self.contactFlowId,
            'outbound_phone_number': self.outboundPhoneNumber,
            'agent_id': self.agentId,
            'agent_name': self.agentName,
            'contact_id_outbound': self.contactIdOutbound,
            'retry_attempt_interval': self.retryAttemptInterval,
            'timestamp': self.timestamp
        }

    @classmethod
    def fromDict(cls, data: Dict[str, Any]) -> 'CallsInSystem':
        """Convert a dictionary to a `CallsInSystem`."""
        return cls(
            contactIdInbound=data.get('contact_id_inbound', ''),
            customerPhoneNumber=data.get('customer_phone_number', ''),
            callAt=data.get('call_at', ''),
            status=Status(data.get('status', '')),
            queueName=data.get('queue_name', ''),
            queueId=data.get('queue_id', ''),
            retries=int(data.get('retries', 0)),
            contactFlowId=data.get('contact_flow_id', ''),
            outboundPhoneNumber=data.get('outbound_phone_number', ''),
            agentId=data.get('agent_id', ''),
            agentName=data.get('agent_name', ''),
            contactIdOutbound=data.get('contact_id_outbound', ''),
            retryAttemptInterval=int(data.get('retry_attempt_interval', 0)),
            timestamp=normalize_timestamp(data.get('timestamp'))
        )

