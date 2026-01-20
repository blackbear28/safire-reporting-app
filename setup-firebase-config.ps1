#!/usr/bin/env pwsh
# Firebase Functions Configuration Helper
# Helps you set up API keys securely for the moderation Cloud Function

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   SAFIRE AI Moderation - Firebase Functions Setup         ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check Firebase CLI
Write-Host "Checking Firebase CLI..." -ForegroundColor Yellow
$firebase = Get-Command firebase -ErrorAction SilentlyContinue
if ($firebase) {
    Write-Host "✓ Firebase CLI found" -ForegroundColor Green
} else {
    Write-Host "✗ Firebase CLI not found" -ForegroundColor Red
    Write-Host "  Install with: npm install -g firebase-tools" -ForegroundColor Red
    exit 1
}

# Check Firebase login
Write-Host "Checking Firebase authentication..." -ForegroundColor Yellow
$firebaseUser = & firebase projects:list 2>&1 | Select-Object -First 1
if ($firebaseUser -match "error" -or $firebaseUser -match "Error") {
    Write-Host "✗ Not logged in to Firebase" -ForegroundColor Red
    Write-Host "  Run: firebase login" -ForegroundColor Red
    exit 1
} else {
    Write-Host "✓ Firebase authenticated" -ForegroundColor Green
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "API Key Configuration" -ForegroundColor Yellow
Write-Host ""

# Get Gemini API Key
$geminiKey = Read-Host "Enter your Gemini API Key (from https://makersuite.google.com/app/apikey)"
if ([string]::IsNullOrWhiteSpace($geminiKey)) {
    Write-Host "✗ Gemini API Key is required" -ForegroundColor Red
    exit 1
}

# Get HuggingFace Token
$hfToken = Read-Host "Enter your HuggingFace Token (from https://huggingface.co/settings/tokens)"
if ([string]::IsNullOrWhiteSpace($hfToken)) {
    Write-Host "✗ HuggingFace Token is required" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Setting Firebase Functions configuration..." -ForegroundColor Yellow
Write-Host ""

# Execute firebase config set
try {
    Write-Host "Running: firebase functions:config:set moderation.gemini_key='***' moderation.hf_token='***'" -ForegroundColor Gray
    
    & firebase functions:config:set "moderation.gemini_key=$geminiKey" "moderation.hf_token=$hfToken"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✓ Configuration saved successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "1. Deploy the Cloud Function:" -ForegroundColor Cyan
        Write-Host "   cd functions" -ForegroundColor Gray
        Write-Host "   npm install" -ForegroundColor Gray
        Write-Host "   firebase deploy --only functions" -ForegroundColor Gray
        Write-Host ""
        Write-Host "2. Copy the function URL from the deploy output" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "3. Update your .env files:" -ForegroundColor Cyan
        Write-Host "   .env (root):" -ForegroundColor Gray
        Write-Host "   REACT_APP_MODERATION_ENDPOINT=https://us-central1-PROJECT.cloudfunctions.net/moderationAnalyze" -ForegroundColor Gray
        Write-Host ""
        Write-Host "   admin-web/.env:" -ForegroundColor Gray
        Write-Host "   REACT_APP_MODERATION_ENDPOINT=https://us-central1-PROJECT.cloudfunctions.net/moderationAnalyze" -ForegroundColor Gray
        Write-Host ""
        Write-Host "4. Restart your apps (npm start)" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "See QUICKSTART_DEPLOY.md for more details" -ForegroundColor Yellow
    } else {
        Write-Host "✗ Configuration failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
