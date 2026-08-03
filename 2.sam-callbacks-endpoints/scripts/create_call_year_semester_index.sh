#!/bin/bash
# Creates the GSI call_year_semester-call_at-index on the DynamoDB table.
#
# Usage:
#   ./create_call_year_semester_index.sh
#   ./create_call_year_semester_index.sh bppr-crt-sso
#   TABLE_NAME=my-table ./create_call_year_semester_index.sh bppr-crt-sso

set -e

TABLE_NAME="${TABLE_NAME:-BPAC-CRT-bppr-amazon-connect-extensions-TableCallsInSystem-VBHP7ZSGIYO8}"
PROFILE="${1:-bppr-crt-sso}"

echo "Creating index call_year_semester-call_at-index on table $TABLE_NAME (profile: $PROFILE)"

aws dynamodb update-table \
  --table-name "$TABLE_NAME" \
  --profile "$PROFILE" \
  --attribute-definitions \
    AttributeName=call_year_semester,AttributeType=S \
    AttributeName=call_at,AttributeType=S \
  --global-secondary-index-updates '[
    {
      "Create": {
        "IndexName": "call_year_semester-call_at-index",
        "KeySchema": [
          {"AttributeName": "call_year_semester", "KeyType": "HASH"},
          {"AttributeName": "call_at", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"}
      }
    }
  ]'

echo "Index creation started. Wait for ACTIVE status, then run backfill_call_year_semester.py"
