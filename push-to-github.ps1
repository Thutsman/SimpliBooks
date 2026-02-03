# Script to push vercel.json to GitHub
# Close VS Code before running this script

Write-Host "Removing Git lock file..." -ForegroundColor Yellow
Remove-Item -Force .git\index.lock -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Write-Host "Staging vercel.json..." -ForegroundColor Green
git add vercel.json

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ File staged successfully" -ForegroundColor Green
    
    Write-Host "Committing changes..." -ForegroundColor Green
    git commit -m "Add vercel.json to fix SPA routing and mobile OAuth redirects"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Changes committed successfully" -ForegroundColor Green
        
        Write-Host "Pushing to GitHub..." -ForegroundColor Green
        git push origin main
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Successfully pushed to GitHub!" -ForegroundColor Green
        } else {
            Write-Host "✗ Push failed. You may need to authenticate." -ForegroundColor Red
        }
    } else {
        Write-Host "✗ Commit failed. Check the error above." -ForegroundColor Red
    }
} else {
    Write-Host "✗ Failed to stage file. The lock file may still exist." -ForegroundColor Red
    Write-Host "Please close VS Code and try again." -ForegroundColor Yellow
}
