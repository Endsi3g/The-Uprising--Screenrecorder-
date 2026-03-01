# ship.ps1 - The Uprising Screenrecorder Deployment Engine
param(
    [string]$Version = "1.2.0",
    [switch]$BuildOnly,
    [switch]$SkipBuild,
    [switch]$NoRelease
)

$ErrorActionPreference = "Stop"
$RemoteURL = "https://github.com/Endsi3g/The-Uprising--Screenrecorder-.git"

Write-Host "`n🚀 Initializing shipment for The Uprising Screenrecorder v$Version..." -ForegroundColor Cyan

# 1. Git Remote Configuration
try {
    $currentOrigin = git remote get-url origin 2>$null
    if ($null -eq $currentOrigin) {
        Write-Host "🔗 Setting up origin..."
        git remote add origin $RemoteURL
    }
    elseif ($currentOrigin -notlike "*Endsi3g*") {
        Write-Host "🔗 Renaming existing origin to 'upstream' and setting new origin..."
        git remote rename origin upstream
        git remote add origin $RemoteURL
    }
}
catch {
    Write-Host "⚠️ Git remote setup encountered a minor snag, continuing..." -ForegroundColor Gray
}

# 2. Production Build
if (-not $SkipBuild) {
    Write-Host "`n📦 Running Production Build (Windows)..." -ForegroundColor Yellow
    npm run build:win
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ Build failed. Check terminal for errors."
        exit 1
    }
    Write-Host "✅ Build successful!" -ForegroundColor Green
}

if ($BuildOnly) {
    Write-Host "`n🏁 Build-only mode complete. No Git actions taken." -ForegroundColor Green
    exit 0
}

# 3. Git Push
Write-Host "`n📂 Staging and Committing changes..." -ForegroundColor Yellow
git add .
git commit -m "release: v$Version - Final Transformation to The Uprising Screenrecorder"

Write-Host "⬆️ Pushing to GitHub (origin/main)..." -ForegroundColor Yellow
$currentBranch = git branch --show-current
git push origin "$($currentBranch):main" --force

# 4. GitHub Release & Changelog
if (-not $NoRelease) {
    Write-Host "`n🏷️ Generating GitHub Release..." -ForegroundColor Yellow
    if ($null -eq (Get-Command gh -ErrorAction SilentlyContinue)) {
        Write-Host "⚠️ GitHub CLI (gh) not found. Skipping release creation." -ForegroundColor Red
    }
    else {
        # Create Git Tag locally
        Write-Host "🏷️ Creating Git Tag: v$Version..."
        git tag -a "v$Version" -m "Release v$Version" -f
        
        # Push Tag to GitHub
        Write-Host "⬆️ Pushing tag to origin..."
        git push origin "v$Version" -f
        
        Write-Host "📝 Extracting release notes for v$Version..."
        $changelog = Get-Content "CHANGELOG.md"
        $inVersion = $false
        $extractedNotes = @()
        foreach ($line in $changelog) {
            if ($line -match "^## \[$Version\]") {
                $inVersion = $true
                continue
            }
            elseif ($line -match "^## \[") {
                if ($inVersion) { break }
            }
            if ($inVersion) {
                $extractedNotes += $line
            }
        }
        $Notes = $extractedNotes -join "`n"
        $NotesPath = "release_notes_$Version.txt"
        $Notes | Out-File -FilePath $NotesPath -Encoding utf8
        
        gh release create "v$Version" --title "v$Version - The Uprising" --notes-file "$NotesPath" --repo "Endsi3g/The-Uprising--Screenrecorder-"
        Write-Host "✅ Release created on GitHub! Build process started in Actions." -ForegroundColor Green
        
        # Cleanup
        Remove-Item -Path $NotesPath -ErrorAction SilentlyContinue
    }
}

Write-Host "`n🎉 MISSION ACCOMPLISHED: The Uprising is Live!" -ForegroundColor Green
Write-Host "--------------------------------------------------`n"
