# AccessForge

Visual AWS access-control playground.

**Design. Simulate. Understand AWS Access.**

Live app: https://main.d1qfwm1aatocn5.amplifyapp.com

AccessForge is an educational product. You pick a simulated identity, choose actions and resources, see **Identity → Action → Resource** as a graph, generate IAM-style policy JSON, and simulate ALLOWED / DENIED / NEEDS REVIEW.

**It does not modify real AWS IAM permissions.**

---

## Where files live

Open this table when you need a file.

| If you want… | Open this folder / file |
| --- | --- |
| This guide | `README.md` |
| Challenge article | `docs/ARTICLE.md` |
| Full file lookup | `docs/FILE-LOCATIONS.md` |
| Homepage / login UI | `frontend/src/pages/Login.tsx` |
| Home (after sign-in) | `frontend/src/pages/Dashboard.tsx` |
| Access graph | `frontend/src/components/AccessGraph.tsx` |
| Playground page | `frontend/src/pages/Playground.tsx` |
| Policy JSON page | `frontend/src/pages/Policy.tsx` |
| AI Advisor page | `frontend/src/pages/Advisor.tsx` |
| Saved scenarios page | `frontend/src/pages/Scenarios.tsx` |
| About page | `frontend/src/pages/About.tsx` |
| App shell / navigation | `frontend/src/components/AppShell.tsx` |
| Styles | `frontend/src/index.css` |
| Frontend API client | `frontend/src/api.ts` |
| Cognito sign-in | `frontend/src/auth.ts` |
| Lambda API entry | `backend/src/handler.py` |
| Policy generator | `backend/src/policy_generator.py` |
| Access simulator | `backend/src/simulator.py` |
| Risk analyzer | `backend/src/risk_analyzer.py` |
| Bedrock advisor | `backend/src/ai_advisor.py` |
| DynamoDB scenarios | `backend/src/scenarios.py` |
| S3 policy export | `backend/src/exports.py` |
| Action catalog | `backend/src/catalog.json` |
| AWS infrastructure | `infra/lib/accessforge-stack.ts` |
| Deploy everything | `scripts/deploy.ps1` |
| Tests | `backend/tests/` |

```
Client Product/
├── README.md                 ← start here
├── docs/                     ← article + file map
├── frontend/                 ← React website (Amplify)
│   └── src/
│       ├── pages/            ← one file per screen
│       ├── components/       ← graph, layout, JSON viewer
│       ├── data/             ← action catalog copy
│       └── *.ts              ← api, auth, config, types
├── backend/                  ← Python Lambda
│   ├── src/                  ← API + policy engine
│   ├── tests/                ← pytest
│   └── scripts/              ← Bedrock smoke test
├── infra/                    ← AWS CDK (TypeScript)
│   ├── bin/accessforge.ts
│   └── lib/accessforge-stack.ts
└── scripts/                  ← deploy helpers
```

---

## Architecture

```
User
 ↓
AWS Amplify Hosting          frontend/
 ↓
Amazon Cognito               frontend/src/auth.ts
 ↓
API Gateway + AWS Lambda     backend/src/handler.py
 ├── Policy Generator
 ├── Policy Validator
 ├── Access Simulator
 ├── Risk Analyzer
 ├── Bedrock Advisor  → Amazon Bedrock Nova Lite
 ├── Scenario Storage → Amazon DynamoDB
 └── Policy Export    → Amazon S3

CloudWatch logs Lambda
```

Defined in `infra/lib/accessforge-stack.ts`.

## AWS services used

| Service | Purpose | Code |
| --- | --- | --- |
| Amplify Hosting | Website | `frontend/`, Amplify app in CDK |
| Cognito | Sign up / sign in | `frontend/src/auth.ts` |
| API Gateway | HTTP API | CDK stack |
| Lambda | Backend | `backend/src/handler.py` |
| DynamoDB | Saved scenarios | `backend/src/scenarios.py` |
| S3 | Exported policy JSON | `backend/src/exports.py` |
| Bedrock Nova Lite | AI advisor | `backend/src/ai_advisor.py` (`amazon.nova-lite-v1:0`) |
| CloudWatch | Logs + error metric | CDK stack |

## Prerequisites

- AWS CLI already logged in
- Node.js 20+
- Python 3.13
- Region: `us-east-1`

## Install

```powershell
cd infra
npm install
cd ..\frontend
npm install
```

## Test

```powershell
cd backend
python -m pytest -q
```

```powershell
cd frontend
npm run build
```

## Deploy

AWS CLI must already be logged in:

```powershell
.\scripts\deploy.ps1
```

That script:

1. Deploys CDK (`infra/`)
2. Writes `frontend/.env.production`
3. Builds the website
4. Publishes the zip to Amplify

## Environment variables

Frontend (`frontend/.env.example`, filled by deploy into `.env.production`):

- `VITE_API_URL`
- `VITE_USER_POOL_ID`
- `VITE_USER_POOL_CLIENT_ID`
- `VITE_AWS_REGION`

Never put AWS access keys in frontend files.

Lambda (set by CDK):

- `SCENARIOS_TABLE`
- `EXPORTS_BUCKET`
- `BEDROCK_MODEL_ID`
- `CORS_ORIGIN`

## Simulation rules

Not the full AWS IAM engine.

1. Matching explicit Deny → DENIED
2. Matching Allow and no matching Deny → ALLOWED
3. No matching Allow → DENIED
4. Condition / NotAction / NotResource → NEEDS REVIEW

## Cleanup

```powershell
cd infra
npx cdk destroy --force
```
