#!/bin/bash

# Test script for Update Calls In System endpoint
# Using real data from DynamoDB table

CONTACT_ID="78b63bc6-bcaa-42cb-bcbf-59d6438d3e44"
CURRENT_CALL_AT="2025-11-14 13:45"
API_ENDPOINT="https://g6uscg6485.execute-api.us-east-1.amazonaws.com/Prod/calls-in-system/${CONTACT_ID}"

# Update fields
# Note: current_call_at is required to identify the record (it's the sort key)
# If you want to update call_at, include both current_call_at (for Key) and call_at (new value)
UPDATE_BODY=$(cat <<EOF
{
  "current_call_at": "${CURRENT_CALL_AT}",
  "queue_name": "VHCallback Sale Updated",
  "queue_id": "arn:aws:connect:us-east-1:833469488738:instance/1a73fe90-89b4-4bbf-8726-33777b4b7519/queue/edf92bce-82a2-4e48-9fe8-9df0bccbbabc"
}
EOF
)

echo "Testing PUT ${API_ENDPOINT}"
echo "Request body:"
echo "${UPDATE_BODY}" | jq .
echo ""
echo "Response:"

# If endpoint requires Cognito auth, uncomment and add your token:
# TOKEN="your-cognito-id-token-here"
# curl -X PUT "${API_ENDPOINT}" \
#   -H "Content-Type: application/json" \
#   -H "Authorization: Bearer ${TOKEN}" \
#   -d "${UPDATE_BODY}"

# If endpoint doesn't require auth (for testing):
curl -X PUT "${API_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "${UPDATE_BODY}" \
  -w "\n\nHTTP Status: %{http_code}\n"

