# TextReminder deploy.ps1
Set-Location $PSScriptRoot

Write-Host "=== TextReminder Deploy ===" -ForegroundColor Cyan

# Find git.exe even if not on system PATH
$git = Get-Command git -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
if (-not $git) {
    $candidates = @(
        "C:\Program Files\Git\bin\git.exe",
        "C:\Program Files (x86)\Git\bin\git.exe",
        "$env:LOCALAPPDATA\Programs\Git\bin\git.exe"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { $git = $c; break }
    }
}
if (-not $git) {
    Write-Host "ERROR: Cannot find git.exe. Open Git Bash and run:" -ForegroundColor Red
    Write-Host "  git add -A" -ForegroundColor Yellow
    Write-Host "  git commit -m 'Deploy: new App.jsx'" -ForegroundColor Yellow
    Write-Host "  git push" -ForegroundColor Yellow
    exit 1
}
Write-Host "Found git: $git" -ForegroundColor Gray

# Clear stale lock if present
$lock = Join-Path $PSScriptRoot ".git\index.lock"
if (Test-Path $lock) {
    Remove-Item $lock -Force
    Write-Host "Cleared stale index.lock" -ForegroundColor Green
}

# Remove old hashed asset if still present
$oldAsset = Join-Path $PSScriptRoot "assets\index-wv0yovCd.js"
if (Test-Path $oldAsset) {
    Remove-Item $oldAsset -Force
    Write-Host "Removed old assets/index-wv0yovCd.js" -ForegroundColor Green
}

# Stage, commit, push
& $git add -A
Write-Host "Staged all changes" -ForegroundColor Green

Write-Host "`nFiles in this commit:" -ForegroundColor Yellow
& $git diff --cached --name-status

& $git commit -m "Deploy: rebuild with new App.jsx (no sidebar, top nav)"
Write-Host "Committed" -ForegroundColor Green

Write-Host "`nPushing to GitHub..." -ForegroundColor Yellow
& $git push

Write-Host "`n=== Done! GitHub Pages will update in ~1 minute ===" -ForegroundColor Cyan
