import os
from typing import Any, Dict, List

from client.dynamo_db_client import DynamoDbClient

EDITOR_ROLE = "editor"
DEFAULT_ROLE = "viewer"


def normalize_identity(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip().lower()


def add_if_present(candidates: List[str], value: Any) -> None:
    normalized = normalize_identity(value)
    if normalized and normalized not in candidates:
        candidates.append(normalized)


def extract_identity_candidates(event: Dict[str, Any]) -> List[str]:
    request_context = event.get("requestContext", {}) or {}
    authorizer = request_context.get("authorizer", {}) or {}
    claims = authorizer.get("claims", {}) or {}

    candidates: List[str] = []
    add_if_present(candidates, claims.get("email"))
    add_if_present(candidates, claims.get("preferred_username"))
    add_if_present(candidates, claims.get("cognito:username"))

    cognito_username = normalize_identity(claims.get("cognito:username"))
    if cognito_username and "_" in cognito_username:
        add_if_present(candidates, cognito_username.split("_", 1)[1])

    name_claim = normalize_identity(claims.get("name"))
    if "@" in name_claim:
        add_if_present(candidates, name_claim)

    identities = claims.get("identities")
    if isinstance(identities, list):
        for identity in identities:
            if isinstance(identity, dict):
                add_if_present(candidates, identity.get("userId"))

    return candidates


def get_region_from_env() -> str:
    return os.environ.get("DYNAMODB_REGION", "") or os.environ.get("AWS_DYNAMODB_REGION", "")


def get_uri_from_env() -> str:
    return os.environ.get("DYNAMODB_URI", "") or os.environ.get("AWS_DYNAMODB_URI", "")


def resolve_user_role(event: Dict[str, Any]) -> str:
    identity_candidates = extract_identity_candidates(event)
    if not identity_candidates:
        raise PermissionError("No identity claims present in token")

    acl_table_name = os.environ.get("ACL_TABLE_NAME", "")
    if not acl_table_name:
        raise RuntimeError("ACL_TABLE_NAME environment variable is required")

    dynamo_db_client = DynamoDbClient.create(get_region_from_env(), get_uri_from_env())
    acl_table = dynamo_db_client.Table(acl_table_name)

    for candidate in identity_candidates:
        result = acl_table.get_item(Key={"email": candidate}, ConsistentRead=True)
        item = result.get("Item")
        if item:
            configured_role = str(item.get("role", DEFAULT_ROLE)).strip().lower()
            is_active = item.get("active", True)
            return configured_role if is_active else DEFAULT_ROLE

    return DEFAULT_ROLE


def require_editor_role(event: Dict[str, Any]) -> None:
    role = resolve_user_role(event)
    if role != EDITOR_ROLE:
        raise PermissionError("Editor role required")
