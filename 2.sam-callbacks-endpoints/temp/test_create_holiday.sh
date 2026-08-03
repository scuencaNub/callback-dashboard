#!/bin/bash

# Test script for Create Holiday Calendar endpoint
API_ENDPOINT="https://g6uscg6485.execute-api.us-east-1.amazonaws.com/Prod/holiday-calendars"

# Create holiday data
CREATE_BODY=$(cat <<EOF
{
  "date": "2025-12-25",
  "name": "Christmas Day",
  "description": "Christmas holiday - completely disable callbacks",
  "configuration_type": "Completely disable callbacks",
  "queue_overrides": {}
}
EOF
)

echo "Testing POST ${API_ENDPOINT}"
echo "Request body:"
echo "${CREATE_BODY}" | jq .
echo ""
echo "Response:"

# If endpoint requires Cognito auth, uncomment and add your token:
# TOKEN="your-cognito-id-token-here"
# curl -X POST "${API_ENDPOINT}" \
#   -H "Content-Type: application/json" \
#   -H "Authorization: Bearer ${TOKEN}" \
#   -d "${CREATE_BODY}"

# If endpoint doesn't require auth (for testing):
curl -X POST "${API_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "${CREATE_BODY}" \
  -w "\n\nHTTP Status: %{http_code}\n"

