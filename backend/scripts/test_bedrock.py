"""One-off check that a configured Bedrock model is invokable in this account."""
import json
import boto3

MODEL_ID = "amazon.nova-lite-v1:0"

client = boto3.client("bedrock-runtime", region_name="us-east-1")
response = client.converse(
    modelId=MODEL_ID,
    messages=[
        {
            "role": "user",
            "content": [{"text": 'Reply with JSON only: {"ok": true}'}],
        }
    ],
    inferenceConfig={"maxTokens": 64},
)
print(json.dumps(response["output"]["message"]["content"][0], indent=2)[:800])
