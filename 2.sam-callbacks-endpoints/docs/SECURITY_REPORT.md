# Security Report - Lambda Handlers

**Date:** 2026-02-20
**Status:** SQL Injection fixed. Remaining items pending.

---

## FIXED

### 1. CRITICAL: SQL Injection in `query_report_by_date/handler.py`

`start_date`, `end_date`, and `phone_numbers` were interpolated directly into the Athena SQL query via f-strings without any sanitization. An attacker could inject arbitrary SQL through these fields.

**Fix applied:** Added regex validation functions (`_validate_date`, `_validate_phone`) that reject any value not matching the expected format before it reaches the query builder. Also removed internal error details from the 500 response.

---

## PENDING

### 2. HIGH: Full event logging exposes JWT tokens

Almost all handlers log the full API Gateway event (`logger.info('Event: %s', event)`), which includes the `Authorization` header with the Cognito JWT token in plain text in CloudWatch Logs.

**Affected handlers:** 14 of 15 handlers.

**Recommendation:** Log only the relevant fields (httpMethod, path, queryStringParameters, pathParameters) instead of the entire event. Strip headers before logging.

---

### 3. HIGH: PII logging (phone numbers)

Phone numbers are logged in plain text.

**Affected handlers:**
- `query_report_by_date/handler.py` (lines 147-148)
- `query_callback_history/handler.py` (lines 120-121)

**Recommendation:** Mask phone numbers in logs (e.g., `+1787***9800`) or remove the log lines entirely.

---

### 4. HIGH: Internal error details exposed in responses

Several handlers return `str(e)` in the HTTP response body on 500 errors, which can reveal infrastructure details (table names, regions, services).

**Affected handlers:**
- `bulk_update_calls_in_system_by_keys/handler.py` (line 271): `"message": str(e)`
- `get_callback_concurrency_metrics/handler.py` (line 107): `'details': error_message`
- `update_queue_configuration/handler.py` (line 154): includes error_message in response

**Recommendation:** Return generic error messages in responses. Keep detailed logging server-side only.

---

### 5. HIGH: Production table name hardcoded as default

In `get_calls_in_system/app.py` (line 128):
```python
table_name = os.environ.get('DYNAMODB_TABLE_NAME', 'BPAC-PRD-BPPR-ACE-TableCallsInSystem-1RAXWEJQ4WJMI')
```

The production table name is hardcoded as a fallback default, exposing internal naming and risking accidental production access if the env var is missing.

**Recommendation:** Remove the default value and fail explicitly if the env var is not set.

---

### 6. MEDIUM: No error handling in 2 handlers

These handlers have no try/except around their main logic. Unhandled exceptions will return Lambda error responses that may expose stack traces.

**Affected handlers:**
- `get_callback_configuration/handler.py` (lines 40-60)
- `get_calls_in_system/app.py` (lines 215-267)

**Recommendation:** Wrap main logic in try/except and return a generic 500 response on failure.

---

### 7. MEDIUM: Permissive CORS (`Access-Control-Allow-Origin: *`)

**Affected handlers:**
- `get_callback_configuration/handler.py` (lines 33-34)
- `get_calls_in_system/app.py` (lines 206-210)

**Recommendation:** Restrict `Access-Control-Allow-Origin` to the allowed frontend domain(s) instead of `*`.

---

### 8. MEDIUM: Missing input format validation

Several handlers accept path parameters or body fields without validating format:

- `query_callback_history/handler.py`: `start_date` / `end_date` not validated
- `delete_holiday_calendar/handler.py`: `date` path param not validated
- `update_holiday_calendar/handler.py`: body passed to service without field-level validation
- `update_queue_configuration/handler.py`: body passed to service without field-level validation

**Recommendation:** Add format validation (regex for dates, whitelist for allowed fields) before processing.

---

### 9. MEDIUM: Identity candidates disclosed in response

In `get_user_permissions/handler.py` (lines 119-128), the response includes `"checked": identity_candidates`, which reveals all identity candidates that were tried during lookup.

**Recommendation:** Remove the `checked` field from the response. It is useful for debugging but should not be exposed to the client.

---

### 10. LOW: Race condition in item move operation

In `bulk_update_calls_in_system_by_keys/handler.py` (lines 159-181), the "move item" operation (put new + delete old) is not atomic. If the delete fails and the rollback also fails, duplicate items remain.

**Recommendation:** Use `transact_write_items` to guarantee atomicity of the put+delete operation.
