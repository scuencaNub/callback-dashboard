from typing import Any, Dict, List


def build_event_log(event: Dict[str, Any]) -> Dict[str, Any]:
    request_context = event.get("requestContext", {}) or {}
    identity = request_context.get("identity", {}) or {}

    return {
        "httpMethod": event.get("httpMethod"),
        "path": event.get("path"),
        "resource": event.get("resource"),
        "pathParameters": event.get("pathParameters"),
        "queryStringParameters": event.get("queryStringParameters"),
        "requestId": request_context.get("requestId"),
        "sourceIp": identity.get("sourceIp"),
        "userAgent": identity.get("userAgent"),
    }


def mask_phone(value: str) -> str:
    digits = "".join(ch for ch in value if ch.isdigit())
    if len(digits) < 4:
        return "***"
    return f"+{digits[:3]}***{digits[-2:]}"


def mask_phone_list(values: List[str]) -> List[str]:
    return [mask_phone(v) for v in values]
