# Script to push all changes to GitHub
# IMPORTANT: Close VS Code/Cursor before running this script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Pushing All Changes to GitHub" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Removing Git lock file..." -ForegroundColor Yellow
Remove-Item -Force .git\index.lock -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "Staging all changes..." -ForegroundColor Green
git add -A

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ All files staged successfully" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Checking staged changes..." -ForegroundColor Green
    git status --short
    Write-Host ""
    
    Write-Host "Committing changes..." -ForegroundColor Green
    git commit -m "Fix sequential invoice/quotation numbering and onboarding loading issue

- Fix getNextInvoiceNumber to find highest number across all invoices (not just most recent)
- Fix getNextQuotationNumber to find highest number across all quotations
- Change quotation prefix from QUO- to QTN- to match user expectations
- Make regex patterns case-insensitive and handle numbers with/without prefixes
- Fix useOnboarding hook to gracefully handle missing database columns
- Add error handling and fallback values for number generation
- Update useEffect hooks to ensure company is loaded before fetching numbers
- Add new migrations for quotations, onboarding, journal entries, and auto-posting
- Add onboarding page and useOnboarding hook"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Changes committed successfully" -ForegroundColor Green
        Write-Host ""
        
        Write-Host "Pushing to GitHub..." -ForegroundColor Green
        git push origin main
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "========================================" -ForegroundColor Green
            Write-Host "✓ Successfully pushed to GitHub!" -ForegroundColor Green
            Write-Host "========================================" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "✗ Push failed. You may need to authenticate." -ForegroundColor Red
            Write-Host "Try running: git push origin main" -ForegroundColor Yellow
        }
    } else {
        Write-Host ""
        Write-Host "✗ Commit failed. Check the error above." -ForegroundColor Red
    }
} else {
    Write-Host ""
    Write-Host "✗ Failed to stage files. The lock file may still exist." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please:" -ForegroundColor Yellow
    Write-Host "1. Close VS Code/Cursor completely" -ForegroundColor Yellow
    Write-Host "2. Wait a few seconds" -ForegroundColor Yellow
    Write-Host "3. Run this script again" -ForegroundColor Yellow
    Write-Host ""
}
