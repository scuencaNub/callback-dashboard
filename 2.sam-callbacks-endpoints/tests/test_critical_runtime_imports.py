import importlib

import pytest


@pytest.mark.parametrize(
    "module_name",
    [
        "boto3",
        "aws_lambda_powertools",
        "mypy_boto3_ssm",
        "mypy_boto3_dynamodb",
    ],
)
def test_runtime_dependency_is_importable(module_name: str) -> None:
    """
    Smoke test for Lambda runtime dependencies.

    This catches missing packages before deployment (e.g. ImportModuleError in Lambda init).
    """
    module = importlib.import_module(module_name)
    assert module is not None
