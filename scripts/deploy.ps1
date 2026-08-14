$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "Checking AWS identity..."
$identity = aws sts get-caller-identity | ConvertFrom-Json
$region = aws configure get region
if (-not $region) { $region = "us-east-1" }
Write-Host "Account $($identity.Account) region $region"

Set-Location "$Root\infra"
if (-not (Test-Path "node_modules")) { npm install }

Write-Host "Bootstrapping CDK (safe to re-run)..."
npx cdk bootstrap "aws://$($identity.Account)/$region"

Write-Host "Deploying AccessForgeStack..."
npx cdk deploy --require-approval never --outputs-file "$Root\infra\cdk-outputs.json"

$outputs = (Get-Content "$Root\infra\cdk-outputs.json" | ConvertFrom-Json).AccessForgeStack
$envDir = "$Root\frontend"
@"
VITE_API_URL=$($outputs.ApiUrl)
VITE_USER_POOL_ID=$($outputs.UserPoolId)
VITE_USER_POOL_CLIENT_ID=$($outputs.UserPoolClientId)
VITE_AWS_REGION=$region
"@ | Set-Content "$envDir\.env.production" -Encoding utf8

Write-Host "Building frontend..."
Set-Location $envDir
if (-not (Test-Path "node_modules")) { npm install }
npm run build

$zipPath = "$envDir\amplify-dist.zip"
python "$Root\scripts\zip_frontend.py" "$envDir\dist" $zipPath

Write-Host "Publishing to Amplify Hosting..."
$deployment = aws amplify create-deployment --app-id $outputs.AmplifyAppId --branch-name main | ConvertFrom-Json
curl.exe -s -X PUT -H "Content-Type: application/zip" --data-binary "@$zipPath" $deployment.zipUploadUrl | Out-Null
aws amplify start-deployment --app-id $outputs.AmplifyAppId --branch-name main --job-id $deployment.jobId | Out-Null

Write-Host "Waiting for Amplify job..."
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 5
  $job = aws amplify get-job --app-id $outputs.AmplifyAppId --branch-name main --job-id $deployment.jobId | ConvertFrom-Json
  $status = $job.job.summary.status
  Write-Host "Amplify status: $status"
  if ($status -eq "SUCCEED") { break }
  if ($status -eq "FAILED" -or $status -eq "CANCELLED") { throw "Amplify deployment $status" }
}

Write-Host "API: $($outputs.ApiUrl)"
Write-Host "App: $($outputs.AmplifyUrl)"
Write-Host "User pool: $($outputs.UserPoolId)"
