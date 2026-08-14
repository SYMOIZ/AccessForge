# File locations

Use this list to find a file by what it does.

Root folder: `C:\Users\symoi\Desktop\Client Product`

## Start here

| File | What it is |
| --- | --- |
| `README.md` | Main project guide |
| `docs/ARTICLE.md` | Weekend Creative Challenge article |
| `docs/FILE-LOCATIONS.md` | This lookup list |
| `.gitignore` | Files not committed (node_modules, dist, env, cdk.out) |

## Website (React)

Folder: `frontend/`

| File | What it is |
| --- | --- |
| `frontend/index.html` | HTML shell and loading screen |
| `frontend/src/main.tsx` | App start |
| `frontend/src/App.tsx` | Routes and sign-in gate |
| `frontend/src/index.css` | All styles |
| `frontend/src/config.ts` | API URL and Cognito IDs |
| `frontend/src/auth.ts` | Sign up, sign in, sign out |
| `frontend/src/api.ts` | Calls to Lambda API |
| `frontend/src/store.tsx` | Playground shared state |
| `frontend/src/types.ts` | TypeScript types |
| `frontend/src/data/catalog.ts` | Identities, resources, actions for the UI |
| `frontend/src/pages/Login.tsx` | Public homepage + sign in |
| `frontend/src/pages/Dashboard.tsx` | Home after sign in |
| `frontend/src/pages/Playground.tsx` | Main Identity / Graph / Resource screen |
| `frontend/src/pages/Policy.tsx` | Policy JSON, copy, download, S3 export |
| `frontend/src/pages/Advisor.tsx` | Bedrock natural-language advisor |
| `frontend/src/pages/Scenarios.tsx` | Saved scenarios list |
| `frontend/src/pages/About.tsx` | What the product is / is not |
| `frontend/src/components/AppShell.tsx` | Left nav, user, sign out |
| `frontend/src/components/AccessGraph.tsx` | Identity → Action → Resource graph |
| `frontend/src/components/JsonViewer.tsx` | JSON display / download helpers |
| `frontend/.env.example` | Env var names (no secrets) |
| `frontend/.env.production` | Live Amplify values (created by deploy, not for commit) |

## Backend (Python Lambda)

Folder: `backend/`

| File | What it is |
| --- | --- |
| `backend/src/handler.py` | API routes |
| `backend/src/catalog.json` | Official-action catalog |
| `backend/src/catalog.py` | Loads the catalog |
| `backend/src/policy_generator.py` | Builds IAM-style JSON |
| `backend/src/policy_validator.py` | Checks policy JSON |
| `backend/src/matching.py` | Wildcard match helpers |
| `backend/src/simulator.py` | ALLOWED / DENIED / NEEDS REVIEW |
| `backend/src/risk_analyzer.py` | Risk findings |
| `backend/src/ai_advisor.py` | Amazon Bedrock Nova Lite |
| `backend/src/scenarios.py` | DynamoDB save/load |
| `backend/src/exports.py` | S3 policy export |
| `backend/tests/` | pytest files |
| `backend/scripts/test_bedrock.py` | One-off Bedrock check |
| `backend/requirements.txt` | Runtime deps |
| `backend/pytest.ini` | Test config |

## Infrastructure (AWS CDK)

Folder: `infra/`

| File | What it is |
| --- | --- |
| `infra/bin/accessforge.ts` | CDK app entry |
| `infra/lib/accessforge-stack.ts` | Cognito, API, Lambda, DynamoDB, S3, Amplify, CloudWatch |
| `infra/cdk.json` | CDK settings |
| `infra/package.json` | CDK npm packages |
| `infra/cdk-outputs.json` | Last deploy URLs and IDs (created by deploy) |

## Scripts

Folder: `scripts/`

| File | What it is |
| --- | --- |
| `scripts/deploy.ps1` | Full deploy: CDK + frontend + Amplify |
| `scripts/zip_frontend.py` | Zip `frontend/dist` with Linux-style paths |

## Tests mapped to behavior

| Test file | Covers |
| --- | --- |
| `backend/tests/test_policy.py` | Policy JSON generation |
| `backend/tests/test_simulator.py` | Allow, deny, explicit deny, needs review |
| `backend/tests/test_risk.py` | Wildcard high risk |
| `backend/tests/test_ai_validation.py` | Bedrock JSON must be valid |
| `backend/tests/test_api_and_scenarios.py` | Auth + user isolation |
| `backend/tests/test_export.py` | S3 export key uses the user id |
