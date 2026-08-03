#!/usr/bin/env python3
"""
Backfill script: Adds call_year_semester to existing items in DynamoDB.

Required for GSI call_year_semester-call_at-index. Items need this attribute
to appear in the index. Derives from call_at:
  - call_at "2024-03-15 14:20" -> call_year_semester "2024-H1" (Jan-Jun)
  - call_at "2024-08-20 10:00" -> call_year_semester "2024-H2" (Jul-Dec)

Usage:
  # Dry run (no writes):  python backfill_call_year_semester.py --dry-run
  # Production:          python backfill_call_year_semester.py
  # With profile:        python backfill_call_year_semester.py --profile bppr-crt-sso

Set TABLE_NAME env var or pass --table-name. Default table:
  BPAC-CRT-bppr-amazon-connect-extensions-TableCallsInSystem-VBHP7ZSGIYO8
"""

import argparse
import os
import sys
from datetime import datetime

import boto3


def derive_call_year_semester(call_at: str) -> str | None:
    """
    From call_at "YYYY-MM-DD HH:MM" returns "YYYY-H1" or "YYYY-H2".
    H1 = Jan-Jun (months 1-6), H2 = Jul-Dec (months 7-12).
    """
    if not call_at or not isinstance(call_at, str):
        return None
    try:
        # call_at format: "2024-03-15 14:20" or "2024-03-15"
        parts = call_at.strip().split()
        date_part = parts[0]  # "2024-03-15"
        year, month, _ = date_part.split("-")
        month_int = int(month)
        semester = "H1" if month_int <= 6 else "H2"
        return f"{year}-{semester}"
    except (ValueError, IndexError):
        return None


def main():
    parser = argparse.ArgumentParser(description="Backfill call_year_semester for GSI")
    parser.add_argument("--table-name", default=os.getenv("TABLE_NAME", "BPAC-CRT-bppr-amazon-connect-extensions-TableCallsInSystem-VBHP7ZSGIYO8"))
    parser.add_argument("--profile", default=os.getenv("AWS_PROFILE", "bppr-crt-sso"))
    parser.add_argument("--region", default=os.getenv("AWS_REGION", "us-east-1"))
    parser.add_argument("--dry-run", action="store_true", help="Scan and report only, do not update")
    parser.add_argument("--limit", type=int, default=0, help="Max items to process (0 = all)")
    args = parser.parse_args()

    session = boto3.Session(profile_name=args.profile, region_name=args.region)
    dynamodb = session.resource("dynamodb")
    table = dynamodb.Table(args.table_name)

    scanned = 0
    updated = 0
    skipped = 0
    errors = 0

    scan_kwargs = {"ProjectionExpression": "contact_id_inbound, call_at, call_year_semester"}
    while True:
        response = table.scan(**scan_kwargs)
        items = response.get("Items", [])

        for item in items:
            scanned += 1
            if args.limit and scanned > args.limit:
                print(f"Reached limit {args.limit}, stopping.")
                break

            contact_id = item.get("contact_id_inbound")
            call_at = item.get("call_at")
            existing = item.get("call_year_semester")

            if existing:
                skipped += 1
                continue

            call_year_semester = derive_call_year_semester(call_at)
            if not call_year_semester:
                print(f"  Skip (no call_at): {contact_id} call_at={call_at}")
                skipped += 1
                continue

            if not args.dry_run:
                try:
                    table.update_item(
                        Key={"contact_id_inbound": contact_id, "call_at": call_at},
                        UpdateExpression="SET call_year_semester = :val",
                        ExpressionAttributeValues={":val": call_year_semester},
                    )
                    updated += 1
                    if updated % 100 == 0:
                        print(f"  Updated {updated} items...")
                except Exception as e:
                    errors += 1
                    print(f"  Error updating {contact_id}/{call_at}: {e}")
            else:
                updated += 1
                if updated <= 5:
                    print(f"  [DRY-RUN] Would set {contact_id} call_at={call_at} -> call_year_semester={call_year_semester}")

        if args.limit and scanned >= args.limit:
            break

        last_key = response.get("LastEvaluatedKey")
        if not last_key:
            break
        scan_kwargs["ExclusiveStartKey"] = last_key

    print(f"\nDone. Scanned={scanned}, Updated={updated}, Skipped={skipped}, Errors={errors}")
    if args.dry_run:
        print("(Dry run - no changes were made)")
    return 0 if errors == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
