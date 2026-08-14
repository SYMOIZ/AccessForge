# infra/

AWS CDK (TypeScript) for AccessForge.

The whole cloud stack is in:

`lib/accessforge-stack.ts`

That file creates Cognito, API Gateway, Lambda, DynamoDB, S3, Amplify Hosting, and CloudWatch.

```powershell
npm install
npx cdk deploy --require-approval never
npx cdk destroy --force
```

Prefer `..\scripts\deploy.ps1` from the project root so the frontend is published too.
