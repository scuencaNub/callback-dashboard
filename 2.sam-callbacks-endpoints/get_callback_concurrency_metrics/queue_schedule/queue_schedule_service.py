#
# This file is part of Nubity Python Skeleton.
#
# (c) Nubity Inc. <esa@nubity.com>.
#
# This source file is subject to a proprietary license that is bundled
# with this source code in the file LICENSE.
#

from __future__ import annotations

import logging
from datetime import datetime
from typing import TYPE_CHECKING, Dict, Optional, Tuple

from aws_lambda_powertools import Logger

if TYPE_CHECKING:
    from mypy_boto3_dynamodb.service_resource import Table

logger: Logger = Logger()
logger.setLevel(logging.INFO)


def _parse_hour(value: str) -> Optional[Tuple[int, int]]:
    """'8:00' / '18:00' -> (8, 0). 'null'/'' -> None (queue closed)."""
    if not value or value.strip().lower() == 'null':
        return None
    try:
        parts = value.strip().split(':')
        return int(parts[0]), int(parts[1])
    except (ValueError, IndexError):
        return None


class QueueScheduleService:
    """Resolve operating hours per queue_name.

    QueueOperationHours is keyed by queue_id (ARN); ActiveContactsInFlow
    uses queue_name. QueueConfiguration provides the name<->id mapping.
    Both config tables are small; each is scanned once per invocation.
    """

    def __init__(self, queueConfigTable: Table, operationHoursTable: Table):
        self.queueConfigTable = queueConfigTable
        self.operationHoursTable = operationHoursTable
        self._nameToId: Dict[str, str] = {}
        self._hoursById: Dict[str, dict] = {}
        self._loaded = False

    def _scan_all(self, table, projection: str, names: dict | None = None):
        kwargs = {'ProjectionExpression': projection}
        if names:
            kwargs['ExpressionAttributeNames'] = names
        response = table.scan(**kwargs)
        items = list(response.get('Items', []))
        while 'LastEvaluatedKey' in response:
            response = table.scan(**kwargs, ExclusiveStartKey=response['LastEvaluatedKey'])
            items.extend(response.get('Items', []))
        return items

    def load(self) -> None:
        if self._loaded:
            return
        try:
            for item in self._scan_all(self.queueConfigTable, 'queue_id, queue_name'):
                name = item.get('queue_name')
                qid = item.get('queue_id')
                if name and qid:
                    self._nameToId[name] = qid

            for item in self._scan_all(
                self.operationHoursTable,
                'queue_id, monday_friday_open, monday_friday_close, '
                'saturday_open, saturday_close, sunday_open, sunday_close',
            ):
                qid = item.get('queue_id')
                if qid:
                    self._hoursById[qid] = item

            self._loaded = True
        except Exception as e:
            logger.error(f'Error loading queue schedule: "{str(e)}".')
            raise

    def _hours_for(self, queueName: str, weekday: int):
        """Returns (open, close) tuples for the given queue_name and
        weekday (0=Mon..6=Sun), or (None, None) if closed/unknown."""
        qid = self._nameToId.get(queueName)
        if not qid:
            return None, None
        hours = self._hoursById.get(qid)
        if not hours:
            return None, None

        if weekday <= 4:  # Mon-Fri
            return _parse_hour(hours.get('monday_friday_open', '')), _parse_hour(hours.get('monday_friday_close', ''))
        if weekday == 5:  # Sat
            return _parse_hour(hours.get('saturday_open', '')), _parse_hour(hours.get('saturday_close', ''))
        return _parse_hour(hours.get('sunday_open', '')), _parse_hour(hours.get('sunday_close', ''))

    def is_out_of_hours(self, queueName: str, prDt: datetime) -> bool:
        """True if prDt (PR local time of the call) is outside the queue's
        operating hours that day. If the queue's hours are unknown, treat
        as within hours (False) so the contact isn't lost to the
        out-of-hours bucket by a data gap."""
        qid = self._nameToId.get(queueName)
        if not qid or qid not in self._hoursById:
            return False  # unknown hours -> treat as within (conservative)

        openH, closeH = self._hours_for(queueName, prDt.weekday())
        if openH is None:
            return True  # queue does not operate that weekday -> out of hours

        callMinutes = prDt.hour * 60 + prDt.minute
        openMinutes = openH[0] * 60 + openH[1]
        closeMinutes = closeH[0] * 60 + closeH[1] if closeH else 24 * 60

        return callMinutes < openMinutes or callMinutes >= closeMinutes
