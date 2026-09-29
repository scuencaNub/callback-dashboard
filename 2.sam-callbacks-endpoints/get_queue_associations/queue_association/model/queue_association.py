#
# This file is part of Nubity Python Skeleton.
#
# (c) Nubity Inc. <esa@nubity.com>.
#
# This source file is subject to a proprietary license that is bundled
# with this source code in the file LICENSE.
#

from typing import Any, Dict


class QueueAssociation:
    """Represent a `QueueAssociation` (mapping of an entry queue to its callback queue)."""

    def __init__(
        self,
        queueArn: str,
        queueId: str,
        queueName: str,
        callbackQueueArn: str,
        callbackQueueId: str,
        callbackQueueName: str,
        forceCallbackEnable: bool
    ):
        self.queueArn = queueArn
        self.queueId = queueId
        self.queueName = queueName
        self.callbackQueueArn = callbackQueueArn
        self.callbackQueueId = callbackQueueId
        self.callbackQueueName = callbackQueueName
        self.forceCallbackEnable = forceCallbackEnable

    def toDict(self) -> Dict[str, Any]:
        """Convert `QueueAssociation` to a dictionary."""
        return {
            'queue_arn': self.queueArn,
            'queue_id': self.queueId,
            'queue_name': self.queueName,
            'callback_queue_arn': self.callbackQueueArn,
            'callback_queue_id': self.callbackQueueId,
            'callback_queue_name': self.callbackQueueName,
            'force_callback_enable': self.forceCallbackEnable
        }

    @classmethod
    def fromDict(cls, data: Dict[str, Any]) -> 'QueueAssociation':
        """Convert a dictionary to a `QueueAssociation`."""
        return cls(
            queueArn=data.get('queue_arn', ''),
            queueId=data.get('queue_id', ''),
            queueName=data.get('queue_name', ''),
            callbackQueueArn=data.get('callback_queue_arn', ''),
            callbackQueueId=data.get('callback_queue_id', ''),
            callbackQueueName=data.get('callback_queue_name', ''),
            forceCallbackEnable=bool(data.get('force_callback_enable', False))
        )
