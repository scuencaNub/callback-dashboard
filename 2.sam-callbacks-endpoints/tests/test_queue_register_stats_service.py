"""Unit tests for the QueueRegisterStatsService.

Uses mocks for DynamoDB Table — no real connections.

Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.6
"""

import sys
from pathlib import Path
from unittest.mock import MagicMock

import pytest

# Add the Lambda directory to sys.path so we can import the service directly
LAMBDA_DIR = Path(__file__).resolve().parents[1] / "get_callback_concurrency_metrics"
sys.path.insert(0, str(LAMBDA_DIR))

from queue_register_stats.queue_register_stats_service import QueueRegisterStatsService


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_dynamo_item(queue_name: str, report_date: str,
                      cust_registered: int = 10,
                      cust_register_pending: int = 3) -> dict:
    """Build a raw DynamoDB-style dict for a QueueRegisterStats record."""
    return {
        "queue_name": queue_name,
        "report_date": report_date,
        "cust_registered": cust_registered,
        "cust_register_pending": cust_register_pending,
    }


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestFindByQueueNameAndDate:
    """Req 1.1 — Query by PK + SK returns the matching item."""

    def test_find_by_queue_name_and_date(self):
        item = _make_dynamo_item("VHCallback Come", "2025-01-15", 42, 5)
        table = MagicMock()
        table.query.return_value = {"Items": [item]}

        service = QueueRegisterStatsService(table)
        result = service.findByQueueNameAndDate("VHCallback Come", "2025-01-15")

        assert len(result) == 1
        assert result[0].queue_name == "VHCallback Come"
        assert result[0].report_date == "2025-01-15"
        assert result[0].cust_registered == 42
        assert result[0].cust_register_pending == 5

        table.query.assert_called_once_with(
            KeyConditionExpression="queue_name = :qn AND report_date = :rd",
            ExpressionAttributeValues={":qn": "VHCallback Come", ":rd": "2025-01-15"},
        )

    def test_find_by_queue_name_and_date_no_results(self):
        table = MagicMock()
        table.query.return_value = {"Items": []}

        service = QueueRegisterStatsService(table)
        result = service.findByQueueNameAndDate("NonExistent", "2099-12-31")

        assert result == []


class TestFindByDate:
    """Req 1.2 — Scan with FilterExpression on report_date."""

    def test_find_by_date(self):
        items = [
            _make_dynamo_item("VHCallback Come", "2025-01-15", 42, 5),
            _make_dynamo_item("VHCallbackTrust", "2025-01-15", 10, 2),
        ]
        table = MagicMock()
        table.scan.return_value = {"Items": items}

        service = QueueRegisterStatsService(table)
        result = service.findByDate("2025-01-15")

        assert len(result) == 2
        assert result[0].queue_name == "VHCallback Come"
        assert result[1].queue_name == "VHCallbackTrust"

        table.scan.assert_called_once_with(
            FilterExpression="report_date = :rd",
            ExpressionAttributeValues={":rd": "2025-01-15"},
        )


class TestFindByQueueName:
    """Req 1.3 — Query by PK only returns all dates for that queue."""

    def test_find_by_queue_name(self):
        items = [
            _make_dynamo_item("VHCallback Come", "2025-01-14", 30, 4),
            _make_dynamo_item("VHCallback Come", "2025-01-15", 42, 5),
        ]
        table = MagicMock()
        table.query.return_value = {"Items": items}

        service = QueueRegisterStatsService(table)
        result = service.findByQueueName("VHCallback Come")

        assert len(result) == 2
        assert result[0].report_date == "2025-01-14"
        assert result[1].report_date == "2025-01-15"

        table.query.assert_called_once_with(
            KeyConditionExpression="queue_name = :qn",
            ExpressionAttributeValues={":qn": "VHCallback Come"},
        )


class TestFindAll:
    """Req 1.4 — Full scan with pagination via LastEvaluatedKey."""

    def test_find_all_with_pagination(self):
        page1_items = [_make_dynamo_item("VHCallback Come", "2025-01-14")]
        page2_items = [_make_dynamo_item("VHCallbackTrust", "2025-01-15")]

        table = MagicMock()
        table.scan.side_effect = [
            {"Items": page1_items, "LastEvaluatedKey": {"queue_name": "VHCallback Come"}},
            {"Items": page2_items},
        ]

        service = QueueRegisterStatsService(table)
        result = service.findAll()

        assert len(result) == 2
        assert result[0].queue_name == "VHCallback Come"
        assert result[1].queue_name == "VHCallbackTrust"
        assert table.scan.call_count == 2

    def test_find_all_empty_table(self):
        table = MagicMock()
        table.scan.return_value = {"Items": []}

        service = QueueRegisterStatsService(table)
        result = service.findAll()

        assert result == []


class TestExceptionPropagation:
    """Req 1.5 — Exceptions from DynamoDB propagate to the caller."""

    def test_exception_propagation(self):
        table = MagicMock()
        table.scan.side_effect = Exception("DynamoDB throttling")

        service = QueueRegisterStatsService(table)

        with pytest.raises(Exception, match="DynamoDB throttling"):
            service.findAll()
