#
# This file is part of Nubity Python Skeleton.
#
# (c) Nubity Inc. <esa@nubity.com>.
#
# This source file is subject to a proprietary license that is bundled
# with this source code in the file LICENSE.
#
import logging
import os
from typing import Any, Dict, List

from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

from api_rest.http_response_factory import HttpResponseFactory
from api_rest.log import build_event_log
from client.dynamo_db_client import DynamoDbClient

logger: Logger = Logger()
logger.setLevel(logging.INFO)

EDITOR_ROLE = "editor"
DEFAULT_ROLE = "viewer"


def _normalize_identity(value: Any) -> str:
    if value is None:
        return ""
    normalized = str(value).strip().lower()
    return normalized


def _add_if_present(candidates: List[str], value: Any) -> None:
    normalized = _normalize_identity(value)
    if normalized and normalized not in candidates:
        candidates.append(normalized)


def _extract_identity_candidates(event: Dict[str, Any]) -> tuple[List[str], Dict[str, Any]]:
    request_context = event.get("requestContext", {}) or {}
    authorizer = request_context.get("authorizer", {}) or {}
    claims = authorizer.get("claims", {}) or {}

    candidates: List[str] = []
    _add_if_present(candidates, claims.get("email"))
    _add_if_present(candidates, claims.get("preferred_username"))
    _add_if_present(candidates, claims.get("cognito:username"))

    cognito_username = _normalize_identity(claims.get("cognito:username"))
    if cognito_username and "_" in cognito_username:
        # For federated users Cognito username can be "<provider>_<user@domain>"
        _add_if_present(candidates, cognito_username.split("_", 1)[1])

    name_claim = _normalize_identity(claims.get("name"))
    if "@" in name_claim:
        _add_if_present(candidates, name_claim)

    identities = claims.get("identities")
    if isinstance(identities, list):
        for identity in identities:
            if isinstance(identity, dict):
                _add_if_present(candidates, identity.get("userId"))

    return candidates, claims


def lambda_handler(event: Dict[str, Any], context: LambdaContext) -> Dict[str, Any]:
    logger.info("Context: %s", context)
    logger.info("Event summary: %s", build_event_log(event))

    headers = {
        "Access-Control-Allow-Methods": "GET,OPTIONS",
    }

    try:
        if "OPTIONS" == event.get("httpMethod"):
            return HttpResponseFactory.create(200, {}, headers)

        identity_candidates, claims = _extract_identity_candidates(event)
        logger.info(
            "Resolving permissions: identity_candidates=%s, email=%s, preferred_username=%s, cognito_username=%s, name=%s",
            identity_candidates,
            claims.get("email"),
            claims.get("preferred_username"),
            claims.get("cognito:username"),
            claims.get("name"),
        )

        if not identity_candidates:
            return HttpResponseFactory.create(
                401,
                {
                    "error": "Unauthorized",
                    "message": "No identity claims present in token",
                },
                headers,
            )

        acl_table_name = os.environ.get("ACL_TABLE_NAME", "")
        if not acl_table_name:
            raise ValueError("ACL_TABLE_NAME environment variable is required")

        dynamo_db_client = DynamoDbClient.create(
            os.environ.get("DYNAMODB_REGION", ""),
            os.environ.get("DYNAMODB_URI", ""),
        )
        acl_table = dynamo_db_client.Table(acl_table_name)

        matched_identity = ""
        item = None
        for candidate in identity_candidates:
            result = acl_table.get_item(Key={"email": candidate}, ConsistentRead=True)
            item = result.get("Item")
            if item:
                matched_identity = candidate
                break

        role = DEFAULT_ROLE
        if item:
            configured_role = str(item.get("role", DEFAULT_ROLE)).strip().lower()
            is_active = item.get("active", True)
            role = configured_role if is_active else DEFAULT_ROLE
        else:
            matched_identity = identity_candidates[0]

        can_edit = role == EDITOR_ROLE

        logger.info(
            "Permissions resolved: matched_identity=%s, role=%s, canEdit=%s, all_identity_candidates=%s",
            matched_identity,
            role,
            can_edit,
            identity_candidates,
        )

        return HttpResponseFactory.create(
            200,
            {
                "email": matched_identity,
                "role": role,
                "canEdit": can_edit,
                "user": str(claims.get("cognito:username", "")),
            },
            headers,
        )

    except Exception as exc:
        logger.exception("Error while resolving user permissions: %s", exc)
        return HttpResponseFactory.create(
            500,
            {
                "error": "Internal server error",
                "message": "Failed to resolve user permissions",
            },
            headers,
        )
