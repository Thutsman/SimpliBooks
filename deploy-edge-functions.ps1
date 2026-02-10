# Deploy Supabase Edge Functions (invite-user, payfast-itn-handler)
# Prerequisites:
#   1. Supabase CLI: https://supabase.com/docs/guides/cli
#   2. One-time link: run "supabase link" and choose your project (or use --project-ref YOUR_REF)
#
# Then run this script to deploy:
#   .\deploy-edge-functions.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# Check if linked ( .supabase folder with project ref )
if (-not (Test-Path ".supabase")) {
    Write-Host "Project not linked to Supabase. Run this first:" -ForegroundColor Yellow
    Write-Host "  supabase link" -ForegroundColor Cyan
    Write-Host "Then run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "Deploying Edge Function: invite-user..." -ForegroundColor Green
supabase functions deploy invite-user
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Done. invite-user is deployed." -ForegroundColor Green

Write-Host "Deploying Edge Function: payfast-itn-handler..." -ForegroundColor Green
supabase functions deploy payfast-itn-handler --no-verify-jwt
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Done. payfast-itn-handler is deployed." -ForegroundColor Green
