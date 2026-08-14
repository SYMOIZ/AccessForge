# Weekend Creative Challenge: AccessForge

AccessForge is a visual AWS access-control playground. It is a small, opinionated product for a weekend: you describe who should be able to do what, you see identity → action → resource as a graph, you get an IAM-style policy document, and you simulate the decision with a clear ALLOWED, DENIED, or NEEDS REVIEW result.

The app is educational. It does not attach policies to real IAM users or roles, and it never asks for AWS root credentials. The UI states that plainly: this playground simulates access decisions and does not modify your AWS account permissions.

## Vision

AWS IAM is powerful and easy to get wrong. Wildcards, explicit deny, and resource ARNs are easier to understand when they are visible. AccessForge treats access control as a studio bench rather than a console clone. You pick a simulated identity such as Data Analyst or Lambda Execution Role, choose a verified action from Amazon S3, DynamoDB, Lambda, or Bedrock, and watch the graph update. Then you generate JSON, run a hypothetical request, and read a risk explanation that is backed by code, not vibes.

The differentiator is the loop:

Natural language → Amazon Bedrock → reviewable recommendation → visual access graph → IAM-style policy → simulation → security explanation.

That loop is the product. It is not a chatbot with AWS logos.

## How it was built

I used AWS CDK for a single infrastructure stack and kept the backend in Python so the policy engine could be tested without deploying anything. The frontend is React and TypeScript, hosted on Amplify Hosting.

The policy generator emits IAM policy language version `2012-10-17`. The simulator is intentionally incomplete: it matches Allow/Deny with `*` wildcards and refuses to pretend it evaluates `Condition`, `NotAction`, or `NotResource`. Those cases return NEEDS REVIEW. The risk analyzer flags wildcard actions, wildcard resources, delete/write-style actions, and broad resource patterns. Every finding includes a recommendation and a disclaimer that this is not a live-account pentest.

Amazon Bedrock is called only from Lambda. The browser never sees AWS keys. Model output must be structured JSON; if validation fails, the API returns an error and nothing is applied. Recommendations are shown before they can be copied into the playground.

Scenarios live in DynamoDB with `pk = USER#<cognito-sub>` and `sk = SCENARIO#<id>`. List, get, update, and delete are scoped to the authenticated user. Dashboard counts are computed from those records. If you have not saved anything, the numbers are zero.

Policy JSON can also be exported to a private Amazon S3 bucket and downloaded with a short-lived presigned URL.

## Architecture

User traffic hits Amplify Hosting, signs in with Amazon Cognito, and calls an API Gateway HTTP API. A JWT authorizer checks the Cognito ID token. One Lambda function routes generate-policy, simulate, analyze, ai-advisor, export-policy, and scenario CRUD. That function reads and writes DynamoDB, writes export files to S3, invokes Bedrock with `bedrock:InvokeModel` / Converse, and writes diagnostic logs to CloudWatch without tokens or secrets.

## What I learned

A playground is more honest when it documents what it will not do. Shipping a miniature IAM evaluator that always answers ALLOWED/DENIED would have been a lie. Returning NEEDS REVIEW is more useful, and it taught me to keep the rule table small enough to test. The four required cases — allow GetObject, deny unlisted DeleteObject, allow s3:* with high risk, and explicit deny precedence — are automated tests, not a slide.

Bedrock is only as safe as the validation around it. Structured JSON, an allow-listed action catalog, and a human review step matter more than a clever prompt.

Free-tier awareness showed up as boring choices: one Lambda, on-demand DynamoDB, seven-day log retention, and a configurable inexpensive Amazon Nova model instead of an invented model ID.

## Try it

Deployed app: https://main.d1qfwm1aatocn5.amplifyapp.com

Project files: see the root `README.md` and `docs/FILE-LOCATIONS.md`.

Tag: #creative-expression
