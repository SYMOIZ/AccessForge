from ai_advisor import AdvisorError, validate_advisor_payload
from policy_generator import generate_policy


def test_valid_ai_payload():
    policy = generate_policy(
        allow_actions=["s3:GetObject"],
        resource="arn:aws:s3:::reports/*",
        deny_actions=["s3:DeleteObject"],
    )
    payload = validate_advisor_payload(
        {
            "identity": "Data Analyst",
            "resources": ["arn:aws:s3:::reports/*"],
            "actions": ["s3:GetObject"],
            "denied_actions": ["s3:DeleteObject"],
            "policy": policy,
            "explanation": "Read reports, do not delete them.",
            "risks": ["Broad prefix reports/*"],
        }
    )
    assert payload["disclaimer"].startswith("AI-generated")
    assert payload["policy"]["Version"] == "2012-10-17"


def test_invalid_ai_action_rejected():
    try:
        validate_advisor_payload(
            {
                "identity": "Data Analyst",
                "resources": ["arn:aws:s3:::reports/*"],
                "actions": ["s3:TotallyFake"],
                "denied_actions": [],
                "policy": {},
                "explanation": "nope",
                "risks": [],
            }
        )
        raise AssertionError("expected failure")
    except AdvisorError as exc:
        assert "Unsupported action" in str(exc)


def test_missing_fields_rejected():
    try:
        validate_advisor_payload({"identity": "x"})
        raise AssertionError("expected failure")
    except AdvisorError as exc:
        assert "missing fields" in str(exc)
