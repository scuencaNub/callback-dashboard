import importlib.util
import json
import sys
import types
from pathlib import Path
from typing import Any, Dict


HANDLER_PATH = Path(__file__).resolve().parents[1] / "update_callback_configuration" / "handler.py"


def load_handler_with_stubs(require_editor_exception: Exception | None = None):
    api_rest_pkg = types.ModuleType("api_rest")
    callback_pkg = types.ModuleType("callback_configuration")
    callback_model_pkg = types.ModuleType("callback_configuration.model")
    client_pkg = types.ModuleType("client")

    editor_authorization_mod = types.ModuleType("api_rest.editor_authorization")
    http_response_factory_mod = types.ModuleType("api_rest.http_response_factory")
    log_mod = types.ModuleType("api_rest.log")
    callback_model_mod = types.ModuleType("callback_configuration.model.callback_configuration")
    ssm_client_mod = types.ModuleType("client.simple_systems_manager_client")

    calls: Dict[str, Any] = {"put_parameter": []}

    def require_editor_role(_event: Dict[str, Any]) -> None:
        if require_editor_exception is not None:
            raise require_editor_exception

    class HttpResponseFactory:
        @staticmethod
        def create(status_code: int, body: Dict[str, Any], headers: Dict[str, str]) -> Dict[str, Any]:
            return {"statusCode": status_code, "body": body, "headers": headers}

    class CallbackConfiguration:
        def __init__(self, data: Dict[str, Any]):
            self.data = data

        @classmethod
        def fromDict(cls, data: Dict[str, Any]):
            return cls(data)

        def toDict(self) -> Dict[str, Any]:
            return self.data

    class SSMClientStub:
        def put_parameter(self, **kwargs: Any) -> None:
            calls["put_parameter"].append(kwargs)

    class SimpleSystemsManagerClient:
        @staticmethod
        def create() -> SSMClientStub:
            return SSMClientStub()

    editor_authorization_mod.require_editor_role = require_editor_role
    http_response_factory_mod.HttpResponseFactory = HttpResponseFactory
    log_mod.build_event_log = lambda event: event
    callback_model_mod.CallbackConfiguration = CallbackConfiguration
    ssm_client_mod.SimpleSystemsManagerClient = SimpleSystemsManagerClient

    sys.modules["api_rest"] = api_rest_pkg
    sys.modules["api_rest.editor_authorization"] = editor_authorization_mod
    sys.modules["api_rest.http_response_factory"] = http_response_factory_mod
    sys.modules["api_rest.log"] = log_mod
    sys.modules["callback_configuration"] = callback_pkg
    sys.modules["callback_configuration.model"] = callback_model_pkg
    sys.modules["callback_configuration.model.callback_configuration"] = callback_model_mod
    sys.modules["client"] = client_pkg
    sys.modules["client.simple_systems_manager_client"] = ssm_client_mod

    spec = importlib.util.spec_from_file_location("test_update_callback_configuration_handler_module", HANDLER_PATH)
    module = importlib.util.module_from_spec(spec)
    assert spec is not None and spec.loader is not None
    spec.loader.exec_module(module)
    return module, calls


def test_update_callback_configuration_success(monkeypatch):
    module, calls = load_handler_with_stubs()
    monkeypatch.setenv("PARAMETER_NAME", "/test/callback-configuration")

    response = module.lambda_handler(
        {
            "httpMethod": "PUT",
            "body": json.dumps({"start_time_asap": "13:00"}),
            "requestContext": {},
        },
        context={},
    )

    assert response["statusCode"] == 200
    assert calls["put_parameter"], "Expected put_parameter to be called"
    assert calls["put_parameter"][0]["Name"] == "/test/callback-configuration"
    assert calls["put_parameter"][0]["Overwrite"] is True


def test_update_callback_configuration_returns_400_for_invalid_json():
    module, _ = load_handler_with_stubs()

    response = module.lambda_handler(
        {
            "httpMethod": "PUT",
            "body": "{invalid",
            "requestContext": {},
        },
        context={},
    )

    assert response["statusCode"] == 400
    assert response["body"]["error"] == "Bad Request"


def test_update_callback_configuration_returns_403_for_non_editor():
    module, _ = load_handler_with_stubs(require_editor_exception=PermissionError("Editor role required"))

    response = module.lambda_handler(
        {
            "httpMethod": "PUT",
            "body": json.dumps({"start_time_asap": "13:00"}),
            "requestContext": {},
        },
        context={},
    )

    assert response["statusCode"] == 403
    assert response["body"]["error"] == "Forbidden"
