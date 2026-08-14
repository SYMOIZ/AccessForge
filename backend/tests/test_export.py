import json

from handler import lambda_handler
from policy_generator import generate_policy


def test_health_lists_expected_services():
    result = lambda_handler(
        {"rawPath": "/health", "requestContext": {"http": {"method": "GET"}}},
        None,
    )
    body = json.loads(result["body"])
    assert result["statusCode"] == 200
    for service in ("lambda", "dynamodb", "s3", "bedrock", "amplify"):
        assert service in body["services"]


def test_export_policy_uses_user_prefix(monkeypatch):
    captured = {}

    class FakeS3:
        def put_object(self, **kwargs):
            captured["put"] = kwargs

        def generate_presigned_url(self, _operation, Params, ExpiresIn):
            captured["url"] = Params
            captured["expires"] = ExpiresIn
            return "https://example.invalid/export"

    import exports as exports_mod

    monkeypatch.setenv("EXPORTS_BUCKET", "accessforge-exports")
    monkeypatch.setattr(exports_mod.boto3, "client", lambda _name: FakeS3())

    policy = generate_policy(allow_actions=["s3:GetObject"], resource="arn:aws:s3:::reports/*")
    result = lambda_handler(
        {
            "rawPath": "/export-policy",
            "requestContext": {
                "http": {"method": "POST"},
                "authorizer": {"jwt": {"claims": {"sub": "user-a"}}},
            },
            "body": json.dumps({"policy": policy}),
        },
        None,
    )
    assert result["statusCode"] == 200
    assert captured["put"]["Key"].startswith("user-a/")
    assert captured["url"]["Key"].startswith("user-a/")
