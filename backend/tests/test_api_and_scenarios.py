import json

from handler import lambda_handler


def _event(method: str, path: str, body=None, sub=None):
    event = {
        "rawPath": path,
        "requestContext": {
            "http": {"method": method},
            "authorizer": {"jwt": {"claims": {"sub": sub}}} if sub else {},
        },
        "body": json.dumps(body) if body is not None else None,
    }
    return event


def test_health_unauthenticated():
    result = lambda_handler(_event("GET", "/health"), None)
    assert result["statusCode"] == 200


def test_protected_route_requires_auth():
    result = lambda_handler(_event("GET", "/scenarios"), None)
    assert result["statusCode"] == 401


def test_generate_policy_with_auth(monkeypatch):
    result = lambda_handler(
        _event(
            "POST",
            "/generate-policy",
            {"actions": ["s3:GetObject"], "resources": ["arn:aws:s3:::reports/*"]},
            sub="user-1",
        ),
        None,
    )
    assert result["statusCode"] == 200
    body = json.loads(result["body"])
    assert body["policy"]["Statement"][0]["Action"] == "s3:GetObject"


def test_simulate_case1():
    policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "Allow",
                "Effect": "Allow",
                "Action": "s3:GetObject",
                "Resource": "arn:aws:s3:::reports/*",
            }
        ],
    }
    result = lambda_handler(
        _event(
            "POST",
            "/simulate",
            {
                "policy": policy,
                "action": "s3:GetObject",
                "resource": "arn:aws:s3:::reports/report.csv",
            },
            sub="user-1",
        ),
        None,
    )
    assert result["statusCode"] == 200
    assert json.loads(result["body"])["decision"] == "ALLOWED"


def test_scenario_crud_user_isolation(monkeypatch):
    store = {}

    class FakeTable:
        def put_item(self, Item):
            store[(Item["pk"], Item["sk"])] = dict(Item)

        def query(self, KeyConditionExpression):
            # boto3 ConditionBase is not used here; handler tests list via patched functions.
            return {"Items": []}

        def get_item(self, Key):
            item = store.get((Key["pk"], Key["sk"]))
            return {"Item": item} if item else {}

        def delete_item(self, Key):
            store.pop((Key["pk"], Key["sk"]), None)

    import scenarios as scenarios_mod

    monkeypatch.setattr(scenarios_mod, "_table", lambda: FakeTable())

    created = lambda_handler(
        _event(
            "POST",
            "/scenarios",
            {
                "name": "Demo",
                "identity": {"id": "data-analyst", "name": "Data Analyst"},
                "resources": ["arn:aws:s3:::reports/*"],
                "actions": ["s3:GetObject"],
                "policy": {"Version": "2012-10-17", "Statement": []},
            },
            sub="user-a",
        ),
        None,
    )
    assert created["statusCode"] == 201
    scenario_id = json.loads(created["body"])["scenarioId"]

    other = lambda_handler(_event("GET", f"/scenarios/{scenario_id}", sub="user-b"), None)
    assert other["statusCode"] == 404

    owner = lambda_handler(_event("GET", f"/scenarios/{scenario_id}", sub="user-a"), None)
    assert owner["statusCode"] == 200
    assert json.loads(owner["body"])["userId"] == "user-a"
