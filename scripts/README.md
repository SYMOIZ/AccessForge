# scripts/

| File | What it does |
| --- | --- |
| `deploy.ps1` | Deploy CDK, build frontend, publish to Amplify |
| `zip_frontend.py` | Zip `frontend/dist` using forward-slash paths (required by Amplify) |

From the project root:

```powershell
.\scripts\deploy.ps1
```
