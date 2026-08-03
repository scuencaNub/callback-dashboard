#
# This file is part of Nubity Python Skeleton.
#
# (c) Nubity Inc. <esa@nubity.com>.
#
# This source file is subject to a proprietary license that is bundled
# with this source code in the file LICENSE.
#
import logging
import os
from typing import Any, Dict, List, Optional

from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

from api_rest.http_response_factory import HttpResponseFactory
from api_rest.log import build_event_log
from active_contacts.active_contacts_service import ActiveContactsService
from active_contacts.model.active_contact import ActiveContact
from calls_lookup.calls_lookup_service import CallsLookupService
from queue_schedule.queue_schedule_service import QueueScheduleService
from client.dynamo_db_client import DynamoDbClient

logger: Logger = Logger()
logger.setLevel(logging.INFO)

SLOT_MINUTES = 15
PR_TZ_NAME = 'America/Puerto_Rico'  # UTC-4, no DST
PR_OFFSET = '-0400'
OUT_OF_HOURS_SLOT = 'out_of_hours'  # friendly label for calls outside operating hours
UNSET_CALLBACK_TYPE = '(unset)'  # contacts with no callback_type (residual edge cases, hidden from output)


def _slot_from_pr_dt(prDt) -> str:
    slotMinute = (prDt.minute // SLOT_MINUTES) * SLOT_MINUTES
    return prDt.replace(minute=slotMinute, second=0, microsecond=0).strftime('%H:%M')


def _parse_pr_timestamp(startTimestamp: str):
    """'2026-07-16T14:07:21-0400' -> aware datetime (PR). None if bad."""
    from datetime import datetime

    if not startTimestamp:
        return None
    ts = startTimestamp
    if len(ts) >= 5 and ts[-5] in '+-' and ts[-3] != ':':
        ts = ts[:-2] + ':' + ts[-2:]
    try:
        return datetime.fromisoformat(ts)
    except (ValueError, TypeError):
        return None


def _call_at_to_pr(callAt: str):
    """call_at is UTC ('YYYY-MM-DD HH:MM') -> aware datetime in PR. None if bad."""
    from datetime import datetime
    from zoneinfo import ZoneInfo

    try:
        utcDt = datetime.strptime(callAt, '%Y-%m-%d %H:%M').replace(tzinfo=ZoneInfo('UTC'))
    except (ValueError, TypeError):
        return None
    return utcDt.astimezone(ZoneInfo(PR_TZ_NAME))


class _Row:
    """One contact placed in a (queue, slot, callback_type) bucket."""

    def __init__(self, queueName: str, timeSlot: str, callbackType: str,
                 offered: bool, outcome: str):
        self.queueName = queueName
        self.timeSlot = timeSlot
        self.callbackType = callbackType
        self.offered = offered
        self.outcome = outcome


def _limit_for(callbackType: str, limitAsap: int, limitSchedule: int) -> Optional[int]:
    if callbackType == 'ASAP':
        return limitAsap
    if callbackType == 'SCHEDULE':
        return limitSchedule
    return None  # (unset) / unknown -> no configured capacity, no %


def _aggregate(rows: List[_Row], date: str, limitAsap: int, limitSchedule: int) -> List[Dict[str, Any]]:
    buckets: Dict[tuple, Dict[str, Any]] = {}

    for r in rows:
        key = (r.queueName, r.timeSlot, r.callbackType)
        bucket = buckets.get(key)
        if bucket is None:
            bucket = {
                'queue_name': r.queueName,
                'date': date,
                'time_slot': r.timeSlot,
                'callback_type': r.callbackType,
                'offered': 0,
                'registered': 0,
                'enqueued': 0,
                'total': 0,
            }
            buckets[key] = bucket

        bucket['total'] += 1
        if r.offered:
            bucket['offered'] += 1
        if r.outcome == 'registered':
            bucket['registered'] += 1
        elif r.outcome == 'enqueued':
            bucket['enqueued'] += 1

    # utilization % per slot vs the configured limit for its callback_type.
    # only registered contacts (have call_at) occupy the slot's capacity.
    # the out_of_hours bucket has no time slot -> no limit/%.
    #
    # scheduling_rate_pct = registered / offered * 100 (conversion offer->schedule
    # per slot). CAVEAT: registered are placed by call_at (when the callback was
    # scheduled) while offered-not-registered are placed by start_timestamp (when
    # the contact entered the flow). those are two different time axes, so within a
    # slot the numerator and denominator are not guaranteed to be the same set of
    # contacts. when registered > offered in a slot, that leakage is visible and the
    # rate is flagged approximate (scheduling_rate_approx = True); the raw value is
    # kept (not capped) so no information is lost.
    for bucket in buckets.values():
        offered = bucket['offered']
        registered = bucket['registered']
        if offered > 0:
            bucket['scheduling_rate_pct'] = round(registered / offered * 100, 2)
            bucket['scheduling_rate_approx'] = registered > offered
        else:
            bucket['scheduling_rate_pct'] = None
            bucket['scheduling_rate_approx'] = False

        if bucket['time_slot'] == OUT_OF_HOURS_SLOT:
            bucket['limit'] = None
            bucket['utilization_pct'] = None
            continue
        limit = _limit_for(bucket['callback_type'], limitAsap, limitSchedule)
        if limit and limit > 0:
            bucket['limit'] = limit
            bucket['utilization_pct'] = round(bucket['registered'] / limit * 100, 2)
        else:
            bucket['limit'] = None
            bucket['utilization_pct'] = None

    # hide rows with no callback_type: after the flow change enqueued contacts
    # carry a defined type, so a residual (unset) is a grain the client does not
    # want to see. dropping these rows does not affect ASAP/SCHEDULE buckets
    # (they are separate keys).
    visible = [b for b in buckets.values() if b['callback_type'] != UNSET_CALLBACK_TYPE]

    return sorted(
        visible,
        key=lambda b: (b['queue_name'], b['time_slot'], b['callback_type']),
    )


def _callback_type_of(entry: Optional[ActiveContact], fallback: str = '') -> str:
    if entry is not None and entry.selectedCallbackType:
        return entry.selectedCallbackType
    if fallback:
        return fallback.upper()
    return UNSET_CALLBACK_TYPE


def _build_rows(
    registered,            # List[ScheduledCall] from CallsInSystem (registered, have call_at)
    registeredEnrich,      # Dict[contact_id -> ActiveContact]
    notRegistered,         # List[ActiveContact] (start_timestamp eje, outcome != registered)
    scheduleService,
) -> List[_Row]:
    """Slot assignment (the rule):
    - registered (outcome=registered, has call_at) -> slot = call_at.
    - not registered + called within operating hours -> slot =
      start_timestamp (call time).
    - not registered + called out of operating hours -> OUT_OF_HOURS_SLOT
      (friendly bucket, no time slot -- e.g. hung up, 3am, never defined
      callback_type).

    Two disjoint universes (registered has call_at; not-registered does
    not), deduped by contact_id.
    """
    rows: List[_Row] = []
    seen = set()

    # registered -> call_at
    for sc in registered:
        if not sc.contactIdInbound or sc.contactIdInbound in seen:
            continue
        prDt = _call_at_to_pr(sc.callAt)
        if prDt is None:
            continue
        seen.add(sc.contactIdInbound)
        entry = registeredEnrich.get(sc.contactIdInbound)
        rows.append(_Row(
            queueName=sc.queueName or (entry.queueName if entry else ''),
            timeSlot=_slot_from_pr_dt(prDt),
            callbackType=_callback_type_of(entry, sc.callbackType),
            offered=entry.callbackAlreadyOffered if entry else False,
            outcome='registered',
        ))

    # not registered -> start_timestamp (within hours) or out_of_hours
    for c in notRegistered:
        if not c.contactId or c.contactId in seen:
            continue
        seen.add(c.contactId)
        prDt = _parse_pr_timestamp(c.startTimestamp)
        if prDt is None:
            continue

        if scheduleService.is_out_of_hours(c.queueName, prDt):
            timeSlot = OUT_OF_HOURS_SLOT
        else:
            timeSlot = _slot_from_pr_dt(prDt)

        rows.append(_Row(
            queueName=c.queueName,
            timeSlot=timeSlot,
            callbackType=_callback_type_of(c),
            offered=c.callbackAlreadyOffered,
            outcome=c.outcome,
        ))

    return rows


def lambda_handler(event: Dict[str, Any], context: LambdaContext) -> Dict[str, Any]:
    """
    Get callback concurrency metrics, broken down by 15-min slot.

    HTTP Method: GET
    Path: /callback-concurrency-metrics
    Query Parameters:
    - date: REQUIRED (YYYY-MM-DD, a Puerto Rico calendar day)
    - queue_name: OPTIONAL (a specific queue, else all queues)

    Slot rule:
    - registered (outcome=registered, has call_at) -> slot = call_at.
    - not registered + within operating hours -> slot = start_timestamp.
    - not registered + out of operating hours -> 'out_of_hours' bucket.

    Per (queue, slot, callback_type): offered, registered, enqueued,
    total (unique contacts, no dupes), limit and utilization_pct
    (registered/limit; only registered occupy capacity; limit =
    LIMIT_ASAP / LIMIT_SCHEDULE; out_of_hours / (unset) -> no %).
    """
    logger.info('Context: %s', context)
    logger.info('Event summary: %s', build_event_log(event))

    headers = {'Access-Control-Allow-Methods': 'GET,OPTIONS'}

    try:
        if 'OPTIONS' == event.get('httpMethod'):
            return HttpResponseFactory.create(200, {}, headers)

        queryParams = event.get('queryStringParameters') or {}
        queueName = queryParams.get('queue_name') or None
        date = queryParams.get('date') or None

        if not date:
            return HttpResponseFactory.create(
                400, {'error': 'Bad request', 'message': 'date is required (YYYY-MM-DD)'}, headers
            )

        limitAsap = int(os.environ.get('LIMIT_ASAP', '120'))
        limitSchedule = int(os.environ.get('LIMIT_SCHEDULE', '20'))

        from datetime import datetime, timedelta
        from zoneinfo import ZoneInfo

        prDayStart = datetime.strptime(date, '%Y-%m-%d').replace(tzinfo=ZoneInfo(PR_TZ_NAME))
        prDayEnd = prDayStart + timedelta(days=1) - timedelta(minutes=1)

        # call_at eje (registered): PR day converted to UTC (call_at in UTC)
        startCallAtUtc = prDayStart.astimezone(ZoneInfo('UTC')).strftime('%Y-%m-%d %H:%M')
        endCallAtUtc = prDayEnd.astimezone(ZoneInfo('UTC')).strftime('%Y-%m-%d %H:%M')
        # start_timestamp eje (not registered): PR day bounds, fixed offset
        startTsPr = f'{date}T00:00:00{PR_OFFSET}'
        endTsPr = f'{date}T23:59:59{PR_OFFSET}'

        dynamoDbClient = DynamoDbClient.create(
            os.environ.get('AWS_DYNAMODB_REGION', ''),
            os.environ.get('AWS_DYNAMODB_URI', '')
        )

        activeContactsTableName = os.environ.get('AWS_DYNAMODB_ACTIVE_CONTACTS_TABLE_NAME', '')
        callsTableName = os.environ.get('AWS_DYNAMODB_CALLS_IN_SYSTEM_TABLE_NAME', '')

        activeContactsService = ActiveContactsService(
            dynamoDbClient.Table(activeContactsTableName), dynamoDbClient, activeContactsTableName
        )
        callsLookupService = CallsLookupService(
            dynamoDbClient, dynamoDbClient.Table(callsTableName), callsTableName
        )
        scheduleService = QueueScheduleService(
            dynamoDbClient.Table(os.environ.get('AWS_DYNAMODB_QUEUE_CONFIG_TABLE_NAME', '')),
            dynamoDbClient.Table(os.environ.get('AWS_DYNAMODB_QUEUE_OPERATION_HOURS_TABLE_NAME', '')),
        )
        scheduleService.load()

        # registered -> callbacks with call_at in the day (call_at eje)
        if queueName:
            registered = callsLookupService.findByQueueAndCallAtRange(queueName, startCallAtUtc, endCallAtUtc)
            calledContacts = activeContactsService.findByQueueAndTimestampRange(queueName, startTsPr, endTsPr)
        else:
            registered = callsLookupService.findAllByCallAtRange(startCallAtUtc, endCallAtUtc)
            calledContacts = activeContactsService.findAllByTimestampRange(startTsPr, endTsPr)

        # enrich registered with offered/callback_type from ActiveContactsInFlow
        registeredEnrich = activeContactsService.findByContactIds(
            [s.contactIdInbound for s in registered if s.contactIdInbound]
        )

        # not-registered universe: contacts that entered the flow in the day
        # whose outcome is NOT registered (enqueued, empty, etc.)
        notRegistered = [c for c in calledContacts if c.outcome != 'registered']

        rows = _build_rows(registered, registeredEnrich, notRegistered, scheduleService)
        items = _aggregate(rows, date, limitAsap, limitSchedule)

        return HttpResponseFactory.create(
            200,
            {'items': items, 'count': len(items)},
            headers
        )
    except Exception as e:
        import traceback
        error_message = str(e)
        error_traceback = traceback.format_exc()
        logger.error(f'Error in get_callback_concurrency_metrics: "{error_message}".')
        logger.error(f'Traceback: {error_traceback}')

        return HttpResponseFactory.create(
            500,
            {
                'error': 'Internal server error',
                'message': 'Failed to retrieve callback concurrency metrics.'
            },
            headers
        )
