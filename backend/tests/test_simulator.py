from policy_generator import generate_policy
from simulator import simulate_access


def _policy(allow, resource="arn:aws:s3:::reports/*", deny=None):
    return generate_policy(allow_actions=allow, resource=resource, deny_actions=deny)


def test_case1_allow_get_object():
    result = simulate_access(
        _policy(["s3:GetObject"]),
        action="s3:GetObject",
        resource="arn:aws:s3:::reports/report.csv",
    )
    assert result["decision"] == "ALLOWED"


def test_case2_deny_unlisted_delete():
    result = simulate_access(
        _policy(["s3:GetObject"]),
        action="s3:DeleteObject",
        resource="arn:aws:s3:::reports/report.csv",
    )
    assert result["decision"] == "DENIED"


def test_case4_explicit_deny_precedence():
    result = simulate_access(
        _policy(["s3:*"], deny=["s3:DeleteObject"]),
        action="s3:DeleteObject",
        resource="arn:aws:s3:::reports/report.csv",
    )
    assert result["decision"] == "DENIED"
    assert "explicit Deny" in result["reason"]


def test_wildcard_allow_delete():
    result = simulate_access(
        _policy(["s3:*"]),
        action="s3:DeleteObject",
        resource="arn:aws:s3:::reports/report.csv",
    )
    assert result["decision"] == "ALLOWED"


def test_needs_review_for_condition():
    policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": "s3:GetObject",
                "Resource": "arn:aws:s3:::reports/*",
                "Condition": {"StringEquals": {"aws:userid": "abc"}},
            }
        ],
    }
    result = simulate_access(
        policy,
        action="s3:GetObject",
        resource="arn:aws:s3:::reports/report.csv",
    )
    assert result["decision"] == "NEEDS_REVIEW"
