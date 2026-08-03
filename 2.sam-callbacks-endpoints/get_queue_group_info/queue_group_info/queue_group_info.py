from typing import Any, Dict


VALID_BEHAVIORS = {"QUEUE", "CALLBACK"}


class QueueGroupInfo:
    """Represent a `QueueGroupInfo` entry."""

    def __init__(
        self,
        queue_group_name: str,
        after_threshold_behavior: str,
    ):
        self.queue_group_name = queue_group_name
        self.after_threshold_behavior = after_threshold_behavior

    def toDict(self) -> Dict[str, Any]:
        return {
            'queue_group_name': self.queue_group_name,
            'after_threshold_behavior': self.after_threshold_behavior,
        }

    @classmethod
    def fromDict(cls, data: Dict[str, Any]) -> 'QueueGroupInfo':
        return cls(
            queue_group_name=str(data.get('queue_group_name', '')),
            after_threshold_behavior=str(data.get('after_threshold_behavior', 'QUEUE')),
        )
