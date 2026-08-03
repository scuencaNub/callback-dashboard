#!/usr/bin/env bash
# Create BPAC-PRD-Callback-UserAcl in prod with same structure as BPAC-CRT-Callback-UserAcl.
# Schema taken from template.yaml (commented UserAclTable): partition key email (S), PAY_PER_REQUEST.
# If CRT table has GSIs or different attributes, run describe-table on CRT and create-table manually.
#
# Prerequisite: aws sso login --profile bppr-prd-sso

set -e

PRD_PROFILE=bppr-prd-sso
PRD_TABLE=BPAC-PRD-Callback-UserAcl

echo "=== Creating table $PRD_TABLE (profile: $PRD_PROFILE) ==="
aws dynamodb create-table \
  --table-name "$PRD_TABLE" \
  --profile "$PRD_PROFILE" \
  --billing-mode PAY_PER_REQUEST \
  --attribute-definitions AttributeName=email,AttributeType=S \
  --key-schema AttributeName=email,KeyType=HASH \
  --output json

echo "=== Waiting for table to be ACTIVE ==="
aws dynamodb wait table-exists --table-name "$PRD_TABLE" --profile "$PRD_PROFILE"
echo "Done. Table $PRD_TABLE is active."
