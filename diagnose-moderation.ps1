#!/usr/bin/env pwsh
# AI Moderation System - Diagnostic & Troubleshooting
# Checks all components of the moderation pipeline

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   SAFIRE AI Moderation - Diagnostic Check                 ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$issuesFound = @()
$checksPassed = 0
$checksFailed = 0

# ============================================================================
# CHECK 1: Firebase CLI
# ============================================================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "1. Firebase CLI & Authentication" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Write-Host "Checking: Firebase CLI installed..." -NoNewline
if (Get-Command firebase -ErrorAction SilentlyContinue) {
    Write-Host " ✓" -ForegroundColor Green
    $checksPassed++
} else {
    Write-Host " ✗" -ForegroundColor Red
    $issuesFound += @{
        Name = "Firebase CLI installed"
        FixHint = "Install: npm install -g firebase-tools"
    }
    $checksFailed++
}

Write-Host "Checking: Firebase authenticated..." -NoNewline
try {
    $result = firebase projects:list 2>&1 | Select-Object -First 1
    if (-not ($result -match "error" -or $result -match "Error")) {
        Write-Host " ✓" -ForegroundColor Green
        $checksPassed++
    } else {
        Write-Host " ✗" -ForegroundColor Red
        $issuesFound += @{
            Name = "Firebase authenticated"
            FixHint = "Run: firebase login"
        }
        $checksFailed++
    }
} catch {
    Write-Host " ✗" -ForegroundColor Red
    $issuesFound += @{
        Name = "Firebase authenticated"
        FixHint = "Run: firebase login"
    }
    $checksFailed++
}

Write-Host ""

# ============================================================================
# CHECK 2: Cloud Function Deployment
# ============================================================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "2. Cloud Function Deployment" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Write-Host "Checking if moderationAnalyze function is deployed..." -NoNewline
try {
    $functionList = firebase functions:list 2>&1 | Out-String
    if ($functionList -match "moderationAnalyze") {
        Write-Host " ✓" -ForegroundColor Green
        $checksPassed++
        
        if ($functionList -match "https://[^\s]+moderationAnalyze") {
            $functionUrl = $matches[0]
            Write-Host "  Function URL found: $functionUrl" -ForegroundColor Gray
        }
    } else {
        Write-Host " ✗" -ForegroundColor Red
        Write-Host "  moderationAnalyze function not found in deployed functions" -ForegroundColor Red
        $issuesFound += @{
            Name = "Cloud Function Deployed"
            FixHint = "Deploy: cd functions; npm install; firebase deploy --only functions"
        }
        $checksFailed++
    }
} catch {
    Write-Host " ✗" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    $checksFailed++
}

Write-Host ""

# ============================================================================
# CHECK 3: API Keys Configuration
# ============================================================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "3. API Keys Configuration" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Write-Host "Checking Firebase Functions config..." -NoNewline
try {
    $config = firebase functions:config:get 2>&1 | Out-String
    
    $geminiConfigured = $config -match "moderation.gemini_key" -and -not ($config -match "moderation.gemini_key: ''")
    $hfConfigured = $config -match "moderation.hf_token" -and -not ($config -match "moderation.hf_token: ''")
    
    if ($geminiConfigured -and $hfConfigured) {
        Write-Host " ✓" -ForegroundColor Green
        Write-Host "  Both Gemini and HuggingFace keys configured" -ForegroundColor Gray
        $checksPassed++
    } else {
        Write-Host " ✗" -ForegroundColor Red
        if (-not $geminiConfigured) {
            Write-Host "  ✗ Gemini API key NOT configured" -ForegroundColor Red
        } else {
            Write-Host "  ✓ Gemini API key configured" -ForegroundColor Green
        }
        if (-not $hfConfigured) {
            Write-Host "  ✗ HuggingFace token NOT configured" -ForegroundColor Red
        } else {
            Write-Host "  ✓ HuggingFace token configured" -ForegroundColor Green
        }
        $issuesFound += @{
            Name = "API Keys Configured"
            FixHint = "Run: firebase functions:config:set moderation.gemini_key='YOUR_KEY' moderation.hf_token='YOUR_TOKEN'"
        }
        $checksFailed++
    }
} catch {
    Write-Host " ✗" -ForegroundColor Red
    Write-Host "  Error checking config: $_" -ForegroundColor Red
    $checksFailed++
}

Write-Host ""

# ============================================================================
# CHECK 4: Environment Files
# ============================================================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "4. Environment Files" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Write-Host "Checking .env (root)..." -NoNewline
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "REACT_APP_MODERATION_ENDPOINT=https://") {
        Write-Host " ✓" -ForegroundColor Green
        $endpoint = ($envContent -split "`n" | Where-Object { $_ -match "REACT_APP_MODERATION_ENDPOINT" }).Split("=")[1].Trim()
        Write-Host "  Endpoint: $endpoint" -ForegroundColor Gray
        $checksPassed++
    } else {
        Write-Host " ✗" -ForegroundColor Red
        Write-Host "  REACT_APP_MODERATION_ENDPOINT not found or invalid" -ForegroundColor Red
        $issuesFound += @{
            Name = ".env (root) Endpoint"
            FixHint = "Add to .env: REACT_APP_MODERATION_ENDPOINT=https://us-central1-YOUR-PROJECT.cloudfunctions.net/moderationAnalyze"
        }
        $checksFailed++
    }
} else {
    Write-Host " ✗" -ForegroundColor Red
    Write-Host "  .env file not found" -ForegroundColor Red
    $issuesFound += @{
        Name = ".env (root) Exists"
        FixHint = "Create .env file in root directory with REACT_APP_MODERATION_ENDPOINT"
    }
    $checksFailed++
}

Write-Host "Checking admin-web/.env..." -NoNewline
if (Test-Path "admin-web/.env") {
    $envContent = Get-Content "admin-web/.env" -Raw
    if ($envContent -match "REACT_APP_MODERATION_ENDPOINT=https://") {
        Write-Host " ✓" -ForegroundColor Green
        $checksPassed++
    } else {
        Write-Host " ✗" -ForegroundColor Red
        Write-Host "  REACT_APP_MODERATION_ENDPOINT not found or invalid" -ForegroundColor Red
        $issuesFound += @{
            Name = "admin-web/.env Endpoint"
            FixHint = "Add to admin-web/.env: REACT_APP_MODERATION_ENDPOINT=https://us-central1-YOUR-PROJECT.cloudfunctions.net/moderationAnalyze"
        }
        $checksFailed++
    }
} else {
    Write-Host " ⚠" -ForegroundColor Yellow
    Write-Host "  admin-web/.env not found (may use default)" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# CHECK 5: Test Endpoint
# ============================================================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "5. Endpoint Connectivity Test" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$endpointUrl = ""
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "REACT_APP_MODERATION_ENDPOINT=(.+)") {
        $endpointUrl = $matches[1].Trim()
    }
}

if ([string]::IsNullOrWhiteSpace($endpointUrl)) {
    Write-Host "No endpoint URL found in .env, skipping connectivity test" -ForegroundColor Yellow
    Write-Host "Add REACT_APP_MODERATION_ENDPOINT to .env to test connectivity" -ForegroundColor Yellow
} else {
    Write-Host "Testing endpoint: $endpointUrl" -NoNewline
    
    try {
        $response = Invoke-WebRequest -Uri $endpointUrl `
            -Method POST `
            -ContentType "application/json" `
            -Body '{"title":"test","description":"test","media":[]}' `
            -TimeoutSec 10 `
            -ErrorAction Stop
        
        if ($response.StatusCode -eq 200) {
            Write-Host " ✓" -ForegroundColor Green
            Write-Host "  Endpoint is reachable and responding" -ForegroundColor Gray
            $checksPassed++
        } else {
            Write-Host " ⚠" -ForegroundColor Yellow
            Write-Host "  Status Code: $($response.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host " ✗" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
        $issuesFound += @{
            Name = "Endpoint Reachable"
            FixHint = "1. Verify endpoint URL is correct. 2. Check Cloud Function is deployed. 3. Check network connectivity."
        }
        $checksFailed++
    }
}

Write-Host ""

# ============================================================================
# SUMMARY
# ============================================================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Diagnostic Summary" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Write-Host "Checks Passed: $checksPassed" -ForegroundColor Green
Write-Host "Checks Failed: $checksFailed" -ForegroundColor Red
Write-Host ""

if ($checksFailed -gt 0) {
    Write-Host "Issues Found and Fixes:" -ForegroundColor Yellow
    Write-Host ""
    
    $issuesFound | ForEach-Object {
        Write-Host "❌ $($_.Name)" -ForegroundColor Red
        Write-Host "   Fix: $($_.FixHint)" -ForegroundColor Yellow
        Write-Host ""
    }
    
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "Recommended Fix Order:" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Check Cloud Function deployment:" -ForegroundColor Yellow
    Write-Host "   firebase functions:list" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. If not deployed, deploy now:" -ForegroundColor Yellow
    Write-Host "   cd functions; npm install; firebase deploy --only functions" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Set API keys:" -ForegroundColor Yellow
    Write-Host "   firebase functions:config:set moderation.gemini_key='YOUR_KEY' moderation.hf_token='YOUR_TOKEN'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "4. Copy function URL and add to .env:" -ForegroundColor Yellow
    Write-Host "   REACT_APP_MODERATION_ENDPOINT=https://us-central1-PROJECT.cloudfunctions.net/moderationAnalyze" -ForegroundColor Gray
    Write-Host ""
    Write-Host "5. Restart apps:" -ForegroundColor Yellow
    Write-Host "   npm start (mobile)" -ForegroundColor Gray
    Write-Host "   cd admin-web; npm start (admin)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "6. Then test again:" -ForegroundColor Yellow
    Write-Host "   .\test-ai-moderation.ps1" -ForegroundColor Gray
    
} else {
    Write-Host "✓ All checks passed! System appears to be properly configured." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Run automated tests:" -ForegroundColor Yellow
    Write-Host "   .\test-ai-moderation.ps1" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Test on mobile app:" -ForegroundColor Yellow
    Write-Host "   Create a report with 'harassment' text" -ForegroundColor Gray
    Write-Host "   Should see rejection popup within 1 second" -ForegroundColor Gray
}

Write-Host ""
Write-Host "For detailed help, see:" -ForegroundColor Cyan
Write-Host "  - TESTING_AI_MODERATION.md" -ForegroundColor Gray
Write-Host "  - TROUBLESHOOTING_SETUP.md" -ForegroundColor Gray
Write-Host "  - DEPLOY_MODERATION.md" -ForegroundColor Gray
Write-Host ""
