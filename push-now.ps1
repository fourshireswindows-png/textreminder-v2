Set-Location $PSScriptRoot

# Clear stale git lock
$lock = Join-Path $PSScriptRoot ".git\index.lock"
if (Test-Path $lock) { Remove-Item $lock -Force; Write-Host "Cleared lock" -ForegroundColor Yellow }

$git = (Get-Command git -ErrorAction SilentlyContinue)?.Source
if (-not $git) {
    foreach ($c in @("C:\Program Files\Git\bin\git.exe","C:\Program Files (x86)\Git\bin\git.exe")) {
        if (Test-Path $c) { $git = $c; break }
    }
}

& $git add app.js dist/app.js src/app.jsx
& $git commit -m "Deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm') - dashboard, list view, tier fixes, SMS caps"
& $git push

Write-Host "`nDone! Site will update in ~1 minute." -ForegroundColor Green
Read-Host "Press Enter to close"
