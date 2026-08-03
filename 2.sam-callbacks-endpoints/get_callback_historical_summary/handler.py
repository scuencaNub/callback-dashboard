#
# This file is part of Nubity Python Skeleton.
#
# (c) Nubity Inc. <esa@nubity.com>.
#
# This source file is subject to a proprietary license that is bundled
# with this source code in the file LICENSE.
#
import json
import logging
import os
from typing import Any, Dict, List, Optional

from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

from api_rest.http_response_factory import HttpResponseFactory
from api_rest.log import build_event_log
from client.dynamo_db_client import DynamoDbClient
from calls_in_system_detail.calls_in_system_detail_service import CallsInSystemDetailService
from calls_in_system_summary.model.registered_call import RegisteredCall
from calls_in_system_summary.calls_in_system_summary_service import CallsInSystemSummaryService

logger: Logger = Logger()
logger.setLevel(logging.INFO)

VALID_STATUSES = {'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'FAILED', 'PENDING'}
SLOT_MINUTES = 15
PR_TZ_NAME = 'America/Puerto_Rico'  # UTC-4, no DST


def _calculate_time_slot(callAt: str) -> Optional[str]:
    """Bucket a call_at ("YYYY-MM-DD HH:MM") into a 15-min slot in Puerto
    Rico time.

    call_at is stored in CallsInSystem as UTC (confirmed against real
    data). Slot capacity is defined by when the callback is set to
    happen in local time, not by when the customer registered -- same
    conversion criteria used by BPAC-PRD-CallbackConcurrencyAnalyze.
    Returns None if the value can't be parsed.
    """
    from datetime import datetime
    from zoneinfo import ZoneInfo

    try:
        utc_dt = datetime.strptime(callAt, '%Y-%m-%d %H:%M').replace(tzinfo=ZoneInfo('UTC'))
    except (ValueError, TypeError):
        return None

    pr_dt = utc_dt.astimezone(ZoneInfo(PR_TZ_NAME))
    slot_minute = (pr_dt.minute // SLOT_MINUTES) * SLOT_MINUTES
    return pr_dt.replace(minute=slot_minute, second=0, microsecond=0).strftime('%H:%M')


def _build_summary_rows(
    calls: List[RegisteredCall],
    date: str,
    queueName: str,
) -> List[Dict[str, Any]]:
    """Aggregate CallsInSystem rows into (time_slot, callback_type, status) rows.

    time_slot comes from call_at (the scheduled callback time), grouped
    by its current status.
    """
    buckets: Dict[tuple, int] = {}

    for call in calls:
        timeSlot = _calculate_time_slot(call.callAt)
        if timeSlot is None:
            logger.warning(f'Skipping call with unparseable call_at: {call.contactIdInbound}')
            continue

        callbackType = call.callbackType or '(unknown)'
        status = call.status or '(unknown)'

        key = (timeSlot, callbackType, status)
        buckets[key] = buckets.get(key, 0) + 1

    rows = []
    for (timeSlot, callbackType, status), count in sorted(buckets.items()):
        rows.append({
            'queue_name': queueName,
            'date': date,
            'time_slot': timeSlot,
            'callback_type': callbackType,
            'status': status,
            'registered': count,
        })

    return rows


def lambda_handler(event: Dict[str, Any], context: LambdaContext) -> Dict[str, Any]:
    """
    Get callback historical summary: count of scheduled callbacks by
    15-min slot, callback_type and status, for a given queue and date.

    HTTP Method: GET
    Path: /callback-historical-summary

    Query Parameters (required):
    - queue_name: exact queue name
    - date: YYYY-MM-DD, a Puerto Rico calendar day. Matched against
      call_at converted from UTC to America/Puerto_Rico (UTC-4) --
      slot capacity is defined by when the callback is set to happen
      in local time, not by when the customer registered.

    Query Parameters (optional):
    - status: comma-separated list of statuses to filter by
      (valid values: COMPLETED, CANCELLED, RESCHEDULED, FAILED, PENDING).
      When provided, only entries with one of these statuses are counted.
    - include_details: "true" to also return the full CallsInSystem
      record (customer_phone_number, agent, retries, timestamp map
      with CB_REGISTERED, etc.) for every entry matched. Adds a
      BatchGetItem round-trip -- opt-in so the lightweight summary view
      doesn't pay for it by default.

    Data source: CallsInSystem's queue_name-call_at-index GSI, queried
    directly for the requested day (no lookahead window needed, since
    call_at is an exact match for the scheduling date).
    """
    logger.info('Context: %s', context)
    logger.info('Event summary: %s', build_event_log(event))

    headers = {
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
    }

    try:
        if 'OPTIONS' == event.get('httpMethod'):
            return HttpResponseFactory.create(200, {}, headers)

        queryParams = event.get('queryStringParameters') or {}
        queueName = queryParams.get('queue_name')
        date = queryParams.get('date')
        statusRaw = queryParams.get('status')
        includeDetails = str(queryParams.get('include_details', '')).lower() == 'true'

        if not queueName:
            return HttpResponseFactory.create(
                400, {'error': 'Bad request', 'message': 'queue_name is required'}, headers
            )
        if not date:
            return HttpResponseFactory.create(
                400, {'error': 'Bad request', 'message': 'date is required (YYYY-MM-DD)'}, headers
            )

        statusFilter: Optional[List[str]] = None
        if statusRaw:
            statusFilter = [s.strip().upper() for s in statusRaw.split(',') if s.strip()]
            invalid = [s for s in statusFilter if s not in VALID_STATUSES]
            if invalid:
                return HttpResponseFactory.create(
                    400,
                    {'error': 'Bad request', 'message': f'Invalid status value(s): {invalid}'},
                    headers,
                )

        dynamoDbClient = DynamoDbClient.create(
            os.environ.get('AWS_DYNAMODB_REGION', ''),
            os.environ.get('AWS_DYNAMODB_URI', '')
        )

        callsInSystemTableName = os.environ.get('AWS_DYNAMODB_CALLS_IN_SYSTEM_TABLE_NAME', '')
        summaryService = CallsInSystemSummaryService(
            dynamoDbClient.Table(callsInSystemTableName)
        )

        # `date` is a Puerto Rico calendar day (the day the caller sees in
        # the dashboard). call_at is stored in UTC, so the PR day
        # boundaries must be converted before querying -- a PR day spans
        # parts of two UTC days (PR is UTC-4, no DST).
        from datetime import datetime, timedelta
        from zoneinfo import ZoneInfo

        prDayStart = datetime.strptime(date, '%Y-%m-%d').replace(tzinfo=ZoneInfo(PR_TZ_NAME))
        prDayEnd = prDayStart + timedelta(days=1) - timedelta(minutes=1)
        startOfDay = prDayStart.astimezone(ZoneInfo('UTC')).strftime('%Y-%m-%d %H:%M')
        endOfDay = prDayEnd.astimezone(ZoneInfo('UTC')).strftime('%Y-%m-%d %H:%M')

        calls = summaryService.findByQueueNameAndCallAtDateRange(
            queueName, startOfDay, endOfDay
        )

        if statusFilter:
            calls = [c for c in calls if c.status in statusFilter]

        rows = _build_summary_rows(calls, date, queueName)

        responseBody: Dict[str, Any] = {
            'items': rows,
            'count': len(rows),
        }

        if includeDetails:
            detailKeys = [(c.contactIdInbound, c.callAt) for c in calls if c.contactIdInbound and c.callAt]
            detailService = CallsInSystemDetailService(dynamoDbClient, callsInSystemTableName)
            responseBody['details'] = detailService.findByKeys(detailKeys)

        return HttpResponseFactory.create(200, responseBody, headers)
    except Exception as e:
        import traceback
        error_message = str(e)
        error_traceback = traceback.format_exc()
        logger.error(f'Error in get_callback_historical_summary: "{error_message}".')
        logger.error(f'Traceback: {error_traceback}')

        return HttpResponseFactory.create(
            500,
            {
                'error': 'Internal server error',
                'message': 'Failed to retrieve callback historical summary.'
            },
            headers
        )
