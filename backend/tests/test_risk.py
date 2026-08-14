from policy_generator import generate_policy
from risk_analyzer import analyze_policy
from simulator import simulate_access


def test_case3_wildcard_allowed_but_high_risk():
    policy = generate_policy(
        allow_actions=["s3:*"],
        resource="arn:aws:s3:::reports/*",
    )
    result = simulate_access(
        policy,
        action="s3:DeleteObject",
        resource="arn:aws:s3:::reports/report.csv",
    )
    analysis = analyze_policy(policy)
    assert result["decision"] == "ALLOWED"
    assert analysis["level"] == "HIGH"
    codes = {item["code"] for item in analysis["findings"]}
    assert "service-wildcard-action" in codes


def test_delete_on_wildcard_is_high():
    policy = generate_policy(
        allow_actions=["s3:DeleteObject"],
        resource="*",
    )
    analysis = analyze_policy(policy)
    assert analysis["level"] == "HIGH"
    assert any(item["code"] == "wildcard-resource" for item in analysis["findings"])
