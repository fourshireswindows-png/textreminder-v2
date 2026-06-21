# TextReminder deploy.ps1
Set-Location $PSScriptRoot

Write-Host "=== TextReminder Deploy ===" -ForegroundColor Cyan

# ── 1. Build ──────────────────────────────────────────────────────────────────
Write-Host "`nBuilding..." -ForegroundColor Yellow
$npm = Get-Command npm -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
if (-not $npm) {
    Write-Host "ERROR: npm not found. Make sure Node.js is installed." -ForegroundColor Red
    exit 1
}
& $npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed. Fix the errors above before deploying." -ForegroundColor Red
    exit 1
}
Write-Host "Build complete." -ForegroundColor Green

# ── 2. Find git ───────────────────────────────────────────────────────────────
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
    Write-Host "ERROR: Cannot find git.exe." -ForegroundColor Red
    exit 1
}

# Clear stale lock if present
$lock = Join-Path $PSScriptRoot ".git\index.lock"
if (Test-Path $lock) {
    Remove-Item $lock -Force
    Write-Host "Cleared stale index.lock" -ForegroundColor Green
}

# ── 3. Commit & push ──────────────────────────────────────────────────────────
& $git add -A

Write-Host "`nFiles in this commit:" -ForegroundColor Yellow
& $git diff --cached --name-status

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
& $git commit -m "Deploy: $timestamp"
Write-Host "Committed" -ForegroundColor Green

Write-Host "`nPushing to GitHub..." -ForegroundColor Yellow
& $git push

Write-Host "`n=== Done! Site will update in ~1 minute ===" -ForegroundColor Cyan
