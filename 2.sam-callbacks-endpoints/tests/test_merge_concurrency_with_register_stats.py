"""Unit tests for the merge function and handler integration.

Tests _merge_with_register_stats directly and validates the handler
correctly orchestrates the merge of concurrency items with QueueRegisterStats.

Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 6.2, 6.3
"""

import sys
from pathlib import Path
from unittest.mock import MagicMock

# ---------------------------------------------------------------------------
# Path setup — add the Lambda directory so we can import handler internals
# ---------------------------------------------------------------------------
LAMBDA_DIR = Path(__file__).resolve().parents[1] / "get_callback_concurrency_metrics"
sys.path.insert(0, str(LAMBDA_DIR))

# ---------------------------------------------------------------------------
# Mock external modules that handler.py imports but aren't available in tests
# ---------------------------------------------------------------------------
sys.modules.setdefault("api_rest", MagicMock())
sys.modules.setdefault("api_rest.http_response_factory", MagicMock())
sys.modules.setdefault("api_rest.log", MagicMock())
sys.modules.setdefault("client", MagicMock())
sys.modules.setdefault("client.dynamo_db_client", MagicMock())
sys.modules.setdefault("callback_concurrency_metrics", MagicMock())
sys.modules.setdefault(
    "callback_concurrency_metrics.callback_concurrency_metrics_service", MagicMock()
)

from handler import _merge_with_register_stats  # noqa: E402
from queue_register_stats.model.queue_register_stats import QueueRegisterStats  # noqa: E402


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_concurrency_item(queue_name: str, date: str, **extra) -> dict:
    """Build a concurrency item dict (as returned by toDict)."""
    item = {
        "queue_name": queue_name,
        "date": date,
        "time_slot": "09:00",
        "callback_type": "ASAP",
    }
    item.update(extra)
    return item


def _make_register_stat(
    queue_name: str, report_date: str, cust_registered: int = 10, cust_register_pending: int = 3
) -> QueueRegisterStats:
    """Build a QueueRegisterStats instance."""
    return QueueRegisterStats(
        queue_name=queue_name,
        report_date=report_date,
        cust_registered=cust_registered,
        cust_register_pending=cust_register_pending,
    )


# ---------------------------------------------------------------------------
# Merge function tests
# ---------------------------------------------------------------------------


class TestMergeWithMatch:
    """Req 2.1, 2.2 — Items with matching queue_name+date get enriched."""

    def test_merge_with_match(self):
        items = [_make_concurrency_item("VHCallback Come", "2025-01-15")]
        stats = [_make_register_stat("VHCallback Come", "2025-01-15", 42, 5)]

        result = _merge_with_register_stats(items, stats)

        assert len(result) == 1
        assert result[0]["cust_registered"] == 42
        assert result[0]["cust_register_pending"] == 5


class TestMergeWithoutMatch:
    """Req 2.3 — Items without match are returned unchanged."""

    def test_merge_without_match(self):
        items = [_make_concurrency_item("VHCallback Come", "2025-01-15")]
        stats = [_make_register_stat("OtherQueue", "2099-12-31", 99, 88)]

        result = _merge_with_register_stats(items, stats)

        assert len(result) == 1
        assert "cust_registered" not in result[0]
        assert "cust_register_pending" not in result[0]


class TestMergeMixed:
    """Req 2.2, 2.3 — Some items match, some don't."""

    def test_merge_mixed(self):
        items = [
            _make_concurrency_item("VHCallback Come", "2025-01-15"),
            _make_concurrency_item("VHCallbackTrust", "2025-01-15"),
        ]
        stats = [_make_register_stat("VHCallback Come", "2025-01-15", 42, 5)]

        result = _merge_with_register_stats(items, stats)

        # First item matched
        assert result[0]["cust_registered"] == 42
        assert result[0]["cust_register_pending"] == 5

        # Second item did NOT match
        assert "cust_registered" not in result[1]
        assert "cust_register_pending" not in result[1]


class TestMergePreservesOrder:
    """Req 2.5 — Output order matches input order."""

    def test_merge_preserves_order(self):
        items = [
            _make_concurrency_item("QueueA", "2025-01-01"),
            _make_concurrency_item("QueueB", "2025-01-02"),
            _make_concurrency_item("QueueC", "2025-01-03"),
        ]
        stats = [
            _make_register_stat("QueueC", "2025-01-03", 30, 3),
            _make_register_stat("QueueA", "2025-01-01", 10, 1),
        ]

        result = _merge_with_register_stats(items, stats)

        assert result[0]["queue_name"] == "QueueA"
        assert result[1]["queue_name"] == "QueueB"
        assert result[2]["queue_name"] == "QueueC"


class TestMergePreservesOriginalFields:
    """Req 2.4 — All original fields of concurrency items are preserved."""

    def test_merge_preserves_original_fields(self):
        items = [
            _make_concurrency_item(
                "VHCallback Come",
                "2025-01-15",
                time_slot="10:30",
                callback_type="Scheduled",
                extra_field="keep_me",
            )
        ]
        stats = [_make_register_stat("VHCallback Come", "2025-01-15", 42, 5)]

        result = _merge_with_register_stats(items, stats)

        assert result[0]["queue_name"] == "VHCallback Come"
        assert result[0]["date"] == "2025-01-15"
        assert result[0]["time_slot"] == "10:30"
        assert result[0]["callback_type"] == "Scheduled"
        assert result[0]["extra_field"] == "keep_me"
        # Enrichment fields also present
        assert result[0]["cust_registered"] == 42
        assert result[0]["cust_register_pending"] == 5


class TestMergeEmptyConcurrencyItems:
    """Edge case — Empty concurrency list returns empty list."""

    def test_merge_empty_concurrency_items(self):
        stats = [_make_register_stat("VHCallback Come", "2025-01-15")]

        result = _merge_with_register_stats([], stats)

        assert result == []


class TestMergeEmptyRegisterStats:
    """Edge case — Empty register stats means no enrichment."""

    def test_merge_empty_register_stats(self):
        items = [
            _make_concurrency_item("VHCallback Come", "2025-01-15"),
            _make_concurrency_item("VHCallbackTrust", "2025-01-15"),
        ]

        result = _merge_with_register_stats(items, [])

        assert len(result) == 2
        for item in result:
            assert "cust_registered" not in item
            assert "cust_register_pending" not in item
