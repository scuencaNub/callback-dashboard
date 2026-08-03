"""Unit tests for the QueueRegisterStats model.

Validates: Requirements 5.2, 5.3, 5.4, 5.5, 6.4, 6.5
"""

import sys
from pathlib import Path

# Add the Lambda directory to sys.path so we can import the model directly
LAMBDA_DIR = Path(__file__).resolve().parents[1] / "get_callback_concurrency_metrics"
sys.path.insert(0, str(LAMBDA_DIR))

from queue_register_stats.model.queue_register_stats import QueueRegisterStats


class TestFromDictComplete:
    """Test fromDict with a complete dictionary (all 4 fields present)."""

    def test_fromDict_with_all_fields(self):
        data = {
            "queue_name": "VHCallback Come",
            "report_date": "2025-01-15",
            "cust_registered": 42,
            "cust_register_pending": 5,
        }
        result = QueueRegisterStats.fromDict(data)

        assert result.queue_name == "VHCallback Come"
        assert result.report_date == "2025-01-15"
        assert result.cust_registered == 42
        assert result.cust_register_pending == 5

    def test_fromDict_with_zero_values(self):
        data = {
            "queue_name": "TestQueue",
            "report_date": "2025-06-01",
            "cust_registered": 0,
            "cust_register_pending": 0,
        }
        result = QueueRegisterStats.fromDict(data)

        assert result.cust_registered == 0
        assert result.cust_register_pending == 0


class TestFromDictMissingFields:
    """Test fromDict with missing fields — verify defaults: '' for strings, 0 for ints."""

    def test_fromDict_empty_dict(self):
        result = QueueRegisterStats.fromDict({})

        assert result.queue_name == ""
        assert result.report_date == ""
        assert result.cust_registered == 0
        assert result.cust_register_pending == 0

    def test_fromDict_missing_string_fields(self):
        data = {"cust_registered": 10, "cust_register_pending": 3}
        result = QueueRegisterStats.fromDict(data)

        assert result.queue_name == ""
        assert result.report_date == ""
        assert result.cust_registered == 10
        assert result.cust_register_pending == 3

    def test_fromDict_missing_int_fields(self):
        data = {"queue_name": "VHCallback Come", "report_date": "2025-01-15"}
        result = QueueRegisterStats.fromDict(data)

        assert result.queue_name == "VHCallback Come"
        assert result.report_date == "2025-01-15"
        assert result.cust_registered == 0
        assert result.cust_register_pending == 0

    def test_fromDict_missing_single_field(self):
        data = {
            "queue_name": "VHCallback Come",
            "report_date": "2025-01-15",
            "cust_registered": 42,
            # cust_register_pending missing
        }
        result = QueueRegisterStats.fromDict(data)

        assert result.cust_register_pending == 0

    def test_fromDict_none_values_treated_as_missing(self):
        data = {
            "queue_name": None,
            "report_date": None,
            "cust_registered": None,
            "cust_register_pending": None,
        }
        result = QueueRegisterStats.fromDict(data)

        assert result.queue_name == ""
        assert result.report_date == ""
        assert result.cust_registered == 0
        assert result.cust_register_pending == 0


class TestToDict:
    """Test toDict returns correct dictionary."""

    def test_toDict_returns_all_fields(self):
        stats = QueueRegisterStats(
            queue_name="VHCallback Come",
            report_date="2025-01-15",
            cust_registered=42,
            cust_register_pending=5,
        )
        result = stats.toDict()

        assert result == {
            "queue_name": "VHCallback Come",
            "report_date": "2025-01-15",
            "cust_registered": 42,
            "cust_register_pending": 5,
        }

    def test_toDict_with_defaults(self):
        stats = QueueRegisterStats(
            queue_name="",
            report_date="",
            cust_registered=0,
            cust_register_pending=0,
        )
        result = stats.toDict()

        assert result == {
            "queue_name": "",
            "report_date": "",
            "cust_registered": 0,
            "cust_register_pending": 0,
        }


class TestRoundTrip:
    """Test round-trip: fromDict(toDict(fromDict(data))) equals fromDict(data)."""

    def test_round_trip_complete_data(self):
        data = {
            "queue_name": "VHCallback Come",
            "report_date": "2025-01-15",
            "cust_registered": 42,
            "cust_register_pending": 5,
        }
        first = QueueRegisterStats.fromDict(data)
        round_tripped = QueueRegisterStats.fromDict(first.toDict())

        assert round_tripped.queue_name == first.queue_name
        assert round_tripped.report_date == first.report_date
        assert round_tripped.cust_registered == first.cust_registered
        assert round_tripped.cust_register_pending == first.cust_register_pending

    def test_round_trip_partial_data(self):
        data = {"queue_name": "VHCallbackTrust"}
        first = QueueRegisterStats.fromDict(data)
        round_tripped = QueueRegisterStats.fromDict(first.toDict())

        assert round_tripped.queue_name == first.queue_name
        assert round_tripped.report_date == first.report_date
        assert round_tripped.cust_registered == first.cust_registered
        assert round_tripped.cust_register_pending == first.cust_register_pending

    def test_round_trip_empty_data(self):
        data = {}
        first = QueueRegisterStats.fromDict(data)
        round_tripped = QueueRegisterStats.fromDict(first.toDict())

        assert round_tripped.queue_name == first.queue_name
        assert round_tripped.report_date == first.report_date
        assert round_tripped.cust_registered == first.cust_registered
        assert round_tripped.cust_register_pending == first.cust_register_pending
