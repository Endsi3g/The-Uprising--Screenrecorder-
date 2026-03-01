# test-app.ps1 - The Uprising Screenrecorder Verification Suite
$ErrorActionPreference = "Continue"

Write-Host "🧪 Initializing Verification Suite..." -ForegroundColor Cyan

# 1. Linting
Write-Host "`n🔍 Checking code quality (Biome)..." -ForegroundColor Yellow
npm run lint
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Linting failed!" -ForegroundColor Red
}
else {
    Write-Host "✅ Linting passed!" -ForegroundColor Green
}

# 2. Unit Tests
Write-Host "`n🧪 Running Unit Tests (Vitest)..." -ForegroundColor Yellow
npm run test
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Tests failed!" -ForegroundColor Red
}
else {
    Write-Host "✅ Tests passed!" -ForegroundColor Green
}

# 3. Type Checking
Write-Host "`n📝 Running Type Check (TSC)..." -ForegroundColor Yellow
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Type check failed!" -ForegroundColor Red
}
else {
    Write-Host "✅ Type check passed!" -ForegroundColor Green
}

Write-Host "`n🏁 Verification Complete." -ForegroundColor Cyan
