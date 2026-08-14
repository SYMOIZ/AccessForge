from policy_generator import generate_policy
from policy_validator import PolicyValidationError, validate_policy_json


def test_generate_allow_policy():
    policy = generate_policy(
        allow_actions=["s3:GetObject"],
        resource="arn:aws:s3:::reports/*",
    )
    assert policy["Version"] == "2012-10-17"
    assert policy["Statement"][0]["Effect"] == "Allow"
    assert policy["Statement"][0]["Action"] == "s3:GetObject"


def test_generate_allow_and_deny():
    policy = generate_policy(
        allow_actions=["s3:GetObject"],
        resource="arn:aws:s3:::reports/*",
        deny_actions=["s3:DeleteObject"],
    )
    effects = [item["Effect"] for item in policy["Statement"]]
    assert effects == ["Allow", "Deny"]


def test_reject_unknown_action():
    try:
        generate_policy(allow_actions=["s3:InventedAction"], resource="arn:aws:s3:::reports/*")
        raise AssertionError("expected failure")
    except PolicyValidationError as exc:
        assert "Unknown" in str(exc)


def test_validate_invalid_json():
    try:
        validate_policy_json("{not-json")
        raise AssertionError("expected failure")
    except PolicyValidationError:
        pass
