#!/usr/bin/env pwsh
# Complete Deployment Automation Script for SAFIRE AI Moderation

param(
    [switch]$SkipChecks = $false,
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   SAFIRE AI Moderation - Full Deployment                 ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "⚠️  DRY RUN MODE - No changes will be made" -ForegroundColor Yellow
    Write-Host ""
}

# Helper function to check command existence
function Test-CommandExists {
    param($command)
    $null = Get-Command $command -ErrorAction SilentlyContinue
    return $?
}

# Step 1: Pre-flight checks
if (-not $SkipChecks) {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "Step 1: Pre-flight Checks" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
    
    # Check Firebase CLI
    Write-Host "  Checking Firebase CLI..." -NoNewline
    if (Test-CommandExists firebase) {
        Write-Host " ✓" -ForegroundColor Green
    } else {
        Write-Host " ✗" -ForegroundColor Red
        Write-Host "  Install with: npm install -g firebase-tools" -ForegroundColor Red
        exit 1
    }
    
    # Check Node.js
    Write-Host "  Checking Node.js..." -NoNewline
    if (Test-CommandExists node) {
        $nodeVersion = node --version
        Write-Host " ✓ ($nodeVersion)" -ForegroundColor Green
    } else {
        Write-Host " ✗" -ForegroundColor Red
        Write-Host "  Install Node.js from https://nodejs.org/" -ForegroundColor Red
        exit 1
    }
    
    # Check .firebaserc
    Write-Host "  Checking .firebaserc..." -NoNewline
    if (Test-Path ".firebaserc") {
        Write-Host " ✓" -ForegroundColor Green
    } else {
        Write-Host " ✗" -ForegroundColor Red
        Write-Host "  Run: firebase init" -ForegroundColor Red
        exit 1
    }
    
    # Check functions directory
    Write-Host "  Checking functions directory..." -NoNewline
    if (Test-Path "functions") {
        Write-Host " ✓" -ForegroundColor Green
    } else {
        Write-Host " ✗" -ForegroundColor Red
        exit 1
    }
    
    # Check moderationAnalyze.js
    Write-Host "  Checking moderationAnalyze.js..." -NoNewline
    if (Test-Path "functions/moderationAnalyze.js") {
        Write-Host " ✓" -ForegroundColor Green
    } else {
        Write-Host " ✗" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "✓ All pre-flight checks passed!" -ForegroundColor Green
    Write-Host ""
}

# Step 2: Configure API Keys
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Step 2: Configure API Keys" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "You need to obtain two API keys:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Gemini API Key:" -ForegroundColor Gray
Write-Host "     • Visit: https://makersuite.google.com/app/apikey" -ForegroundColor Gray
Write-Host "     • Click 'Create API key'" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. HuggingFace Token:" -ForegroundColor Gray
Write-Host "     • Visit: https://huggingface.co/settings/tokens" -ForegroundColor Gray
Write-Host "     • Create a new token with 'read' access" -ForegroundColor Gray
Write-Host ""

if ($DryRun) {
    Write-Host "⚠️  Skipping actual configuration in dry-run mode" -ForegroundColor Yellow
} else {
    $geminiKey = Read-Host "Enter Gemini API Key"
    if ([string]::IsNullOrWhiteSpace($geminiKey)) {
        Write-Host "✗ API Key cannot be empty" -ForegroundColor Red
        exit 1
    }
    
    $hfToken = Read-Host "Enter HuggingFace Token"
    if ([string]::IsNullOrWhiteSpace($hfToken)) {
        Write-Host "✗ Token cannot be empty" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "Setting Firebase configuration..." -ForegroundColor Yellow
    & firebase functions:config:set "moderation.gemini_key=$geminiKey" "moderation.hf_token=$hfToken"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ API keys configured successfully!" -ForegroundColor Green
    } else {
        Write-Host "✗ Configuration failed" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# Step 3: Install dependencies
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Step 3: Install Dependencies" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "Would run: cd functions && npm install" -ForegroundColor Gray
} else {
    Push-Location functions
    Write-Host "Installing Cloud Functions dependencies..." -ForegroundColor Yellow
    npm install
    Pop-Location
    Write-Host "✓ Dependencies installed" -ForegroundColor Green
}

Write-Host ""

# Step 4: Deploy Cloud Function
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Step 4: Deploy Cloud Function" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "Would run: firebase deploy --only functions" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Function URL would be: https://us-central1-YOUR-PROJECT.cloudfunctions.net/moderationAnalyze" -ForegroundColor Gray
} else {
    Write-Host "Deploying Cloud Function..." -ForegroundColor Yellow
    & firebase deploy --only functions
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✓ Cloud Function deployed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Copy the function URL from the output above" -ForegroundColor Yellow
    } else {
        Write-Host "✗ Deployment failed" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# Step 5: Update environment files
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Step 5: Update Environment Files" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "Would update the following files:" -ForegroundColor Gray
    Write-Host "  • .env (root)" -ForegroundColor Gray
    Write-Host "  • admin-web/.env" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Add this line to both files:" -ForegroundColor Gray
    Write-Host "  REACT_APP_MODERATION_ENDPOINT=https://us-central1-YOUR-PROJECT.cloudfunctions.net/moderationAnalyze" -ForegroundColor Gray
} else {
    $endpointUrl = Read-Host "Enter the Cloud Function URL (paste from deploy output above)"
    
    if ([string]::IsNullOrWhiteSpace($endpointUrl)) {
        Write-Host "✗ URL cannot be empty" -ForegroundColor Red
        exit 1
    }
    
    # Update root .env
    Write-Host "Updating .env..." -NoNewline
    if (Test-Path ".env") {
        # Remove existing REACT_APP_MODERATION_ENDPOINT if present
        $content = Get-Content ".env" -Raw
        $content = $content -replace 'REACT_APP_MODERATION_ENDPOINT=.*(\r?\n|$)', ''
        $content = $content + "`nREACT_APP_MODERATION_ENDPOINT=$endpointUrl`n"
        Set-Content ".env" $content
    } else {
        "REACT_APP_MODERATION_ENDPOINT=$endpointUrl" | Add-Content ".env"
    }
    Write-Host " ✓" -ForegroundColor Green
    
    # Update admin-web/.env
    Write-Host "Updating admin-web/.env..." -NoNewline
    if (Test-Path "admin-web/.env") {
        $content = Get-Content "admin-web/.env" -Raw
        $content = $content -replace 'REACT_APP_MODERATION_ENDPOINT=.*(\r?\n|$)', ''
        $content = $content + "`nREACT_APP_MODERATION_ENDPOINT=$endpointUrl`n"
        Set-Content "admin-web/.env" $content
    } else {
        "REACT_APP_MODERATION_ENDPOINT=$endpointUrl" | Add-Content "admin-web/.env"
    }
    Write-Host " ✓" -ForegroundColor Green
}

Write-Host ""

# Summary
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Deployment Summary" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "✓ Dry run complete - no changes were made" -ForegroundColor Green
    Write-Host ""
    Write-Host "To proceed with actual deployment, run:" -ForegroundColor Yellow
    Write-Host "  .\deploy-with-config.ps1" -ForegroundColor Cyan
} else {
    Write-Host "✓ Deployment complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Kill any running dev servers (Ctrl+C)" -ForegroundColor Cyan
    Write-Host "2. Restart your apps:" -ForegroundColor Cyan
    Write-Host "   npm start  # for mobile" -ForegroundColor Gray
    Write-Host "   cd admin-web && npm start  # for admin panel" -ForegroundColor Gray
    Write-Host "3. Test the moderation:" -ForegroundColor Cyan
    Write-Host "   • Create a report with content: 'harassment' (keyword block)" -ForegroundColor Gray
    Write-Host "   • Check Moderation Logs in admin panel" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  See DEPLOY_MODERATION.md for common issues and solutions" -ForegroundColor Gray
}

Write-Host ""
