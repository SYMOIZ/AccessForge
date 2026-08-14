# backend/

Python AWS Lambda code for the AccessForge API.

| Look here | For |
| --- | --- |
| `src/handler.py` | All HTTP routes |
| `src/catalog.json` | Allowed IAM actions |
| `src/simulator.py` | ALLOWED / DENIED / NEEDS REVIEW |
| `src/ai_advisor.py` | Bedrock Nova Lite |
| `src/scenarios.py` | DynamoDB |
| `src/exports.py` | S3 export |
| `tests/` | pytest |

```powershell
python -m pytest -q
```
