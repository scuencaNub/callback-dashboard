#!/bin/bash

# Execute aws sts assume-role and capture the output
echo "Assuming role..."
ASSUME_ROLE_OUTPUT=$(aws sts assume-role \
  --role-arn "arn:aws:iam::825765398662:role/aws-gcaserotto-role" \
  --role-session-name "test-session")

# Check if the command was successful
if [ $? -ne 0 ]; then
    echo "Error: Failed to assume role"
    exit 1
fi

# Extract credentials using jq
ACCESS_KEY_ID=$(echo "$ASSUME_ROLE_OUTPUT" | jq -r '.Credentials.AccessKeyId')
SECRET_ACCESS_KEY=$(echo "$ASSUME_ROLE_OUTPUT" | jq -r '.Credentials.SecretAccessKey')
SESSION_TOKEN=$(echo "$ASSUME_ROLE_OUTPUT" | jq -r '.Credentials.SessionToken')

# Export environment variables
export AWS_ACCESS_KEY_ID="$ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$SECRET_ACCESS_KEY"
export AWS_SESSION_TOKEN="$SESSION_TOKEN"

# Print the export commands (useful for sourcing)
echo "export AWS_ACCESS_KEY_ID=\"$ACCESS_KEY_ID\""
echo "export AWS_SECRET_ACCESS_KEY=\"$SECRET_ACCESS_KEY\""
echo "export AWS_SESSION_TOKEN=\"$SESSION_TOKEN\""

echo ""
echo "Credentials have been exported to environment variables."
echo "To use these credentials in your current shell, run:"
echo "source ./assume-role.sh"