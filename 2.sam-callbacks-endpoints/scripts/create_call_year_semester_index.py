#!/usr/bin/env python3
"""
Creates the GSI call_year_semester-call_at-index on the DynamoDB table.

This index allows querying by date range without phone_number:
  - Partition key: call_year_semester ("2024-H1", "2024-H2")
  - Sort key: call_at (full datetime)

Usage:
  python create_call_year_semester_index.py --profile bppr-crt-sso
  python create_call_year_semester_index.py --table-name MY-TABLE --profile bppr-crt-sso

Set TABLE_NAME env var or pass --table-name.
"""

import argparse
import os
import sys

import boto3


INDEX_NAME = "call_year_semester-call_at-index"
DEFAULT_TABLE = "BPAC-CRT-bppr-amazon-connect-extensions-TableCallsInSystem-VBHP7ZSGIYO8"


def main():
    parser = argparse.ArgumentParser(description="Create call_year_semester GSI")
    parser.add_argument("--table-name", default=os.getenv("TABLE_NAME", DEFAULT_TABLE))
    parser.add_argument("--profile", default=os.getenv("AWS_PROFILE", "bppr-crt-sso"))
    parser.add_argument("--region", default=os.getenv("AWS_REGION", "us-east-1"))
    parser.add_argument("--check-only", action="store_true", help="Only check if index exists")
    args = parser.parse_args()

    session = boto3.Session(profile_name=args.profile, region_name=args.region)
    client = session.client("dynamodb")

    try:
        resp = client.describe_table(TableName=args.table_name)
    except client.exceptions.ResourceNotFoundException:
        print(f"Error: Table {args.table_name} not found")
        return 1

    existing = [g["IndexName"] for g in resp["Table"].get("GlobalSecondaryIndexes", [])]
    if INDEX_NAME in existing:
        print(f"Index {INDEX_NAME} already exists on table {args.table_name}")
        return 0

    if args.check_only:
        print(f"Index {INDEX_NAME} does not exist. Run without --check-only to create.")
        return 0

    print(f"Creating index {INDEX_NAME} on table {args.table_name}...")

    try:
        client.update_table(
            TableName=args.table_name,
            AttributeDefinitions=[
                {"AttributeName": "call_year_semester", "AttributeType": "S"},
                {"AttributeName": "call_at", "AttributeType": "S"},
            ],
            GlobalSecondaryIndexUpdates=[
                {
                    "Create": {
                        "IndexName": INDEX_NAME,
                        "KeySchema": [
                            {"AttributeName": "call_year_semester", "KeyType": "HASH"},
                            {"AttributeName": "call_at", "KeyType": "RANGE"},
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                    }
                }
            ],
        )
        print(f"Index {INDEX_NAME} creation started. Status will be CREATING until it becomes ACTIVE (typically a few minutes).")
        print("Run backfill_call_year_semester.py after the index is ACTIVE to populate it.")
        return 0
    except client.exceptions.LimitExceededException:
        print("Error: Too many concurrent index creations. Wait and retry.")
        return 1
    except Exception as e:
        print(f"Error: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
