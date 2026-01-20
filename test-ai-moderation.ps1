#!/usr/bin/env pwsh
# AI Moderation System - Automated Testing Script
# Tests text and image moderation via HTTP endpoints

param(
    [string]$EndpointUrl = "",
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"

# Colors for output
$colors = @{
    Header    = "Cyan"
    Success   = "Green"
    Error     = "Red"
    Warning   = "Yellow"
    Info      = "White"
    Muted     = "Gray"
}

function Write-ColorLine {
    param($Text, $Color = "White")
    Write-Host $Text -ForegroundColor $Color
}

function Test-Endpoint {
    param($Url)
    try {
        $response = Invoke-WebRequest -Uri $Url -Method HEAD -TimeoutSec 5 -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# ============================================================================
# HEADER
# ============================================================================

Write-Host ""
Write-ColorLine "╔════════════════════════════════════════════════════════════╗" -Color $colors.Header
Write-ColorLine "║   SAFIRE AI Moderation - Automated Test Suite             ║" -Color $colors.Header
Write-ColorLine "╚════════════════════════════════════════════════════════════╝" -Color $colors.Header
Write-Host ""

# ============================================================================
# SETUP
# ============================================================================

Write-ColorLine "Step 1: Configuration" -Color $colors.Header
Write-Host ""

if ([string]::IsNullOrWhiteSpace($EndpointUrl)) {
    Write-ColorLine "Endpoint URL not provided. Checking environment..." -Color $colors.Info
    
    # Try to find from .env
    if (Test-Path ".env") {
        $envContent = Get-Content ".env" -Raw
        if ($envContent -match 'REACT_APP_MODERATION_ENDPOINT=(.+)') {
            $EndpointUrl = $matches[1].Trim()
            Write-ColorLine "✓ Found endpoint in .env: $EndpointUrl" -Color $colors.Success
        }
    }
    
    if ([string]::IsNullOrWhiteSpace($EndpointUrl)) {
        $EndpointUrl = Read-Host "Enter Cloud Function URL (e.g., https://us-central1-PROJECT.cloudfunctions.net/moderationAnalyze)"
    }
}

Write-Host ""
Write-ColorLine "Endpoint: $EndpointUrl" -Color $colors.Muted

# Test connectivity
Write-ColorLine "Testing endpoint connectivity..." -Color $colors.Info
if (Test-Endpoint $EndpointUrl) {
    Write-ColorLine "✓ Endpoint is reachable" -Color $colors.Success
} else {
    Write-ColorLine "⚠ Endpoint may not be reachable (continuing anyway)" -Color $colors.Warning
}

Write-Host ""

# ============================================================================
# TEST RESULTS TRACKING
# ============================================================================

$testResults = @()
$testCount = 0
$passCount = 0
$failCount = 0

function Add-TestResult {
    param(
        [string]$Name,
        [string]$Status,
        [string]$Message,
        [string]$Response
    )
    
    global:$testResults += @{
        Name     = $Name
        Status   = $Status
        Message  = $Message
        Response = $Response
    }
    
    if ($Status -eq "PASS") {
        global:$passCount++
    } else {
        global:$failCount++
    }
    global:$testCount++
}

# ============================================================================
# TEST CASES
# ============================================================================

Write-ColorLine "Step 2: Running Test Cases" -Color $colors.Header
Write-Host ""

# Test 1: Keyword Block - Harassment
Write-ColorLine "Test 1: Keyword Block (Harassment)" -Color $colors.Info
try {
    $payload = @{
        title       = "Test Report 1"
        description = "This is harassment"
        media       = @()
    } | ConvertTo-Json
    
    if ($Verbose) {
        Write-ColorLine "  → Sending: $payload" -Color $colors.Muted
    }
    
    $response = Invoke-WebRequest -Uri $EndpointUrl `
        -Method POST `
        -ContentType "application/json" `
        -Body $payload `
        -TimeoutSec 15
    
    $body = $response.Content | ConvertFrom-Json
    
    if ($body.blocked -eq $true -or $body.status -eq "blocked") {
        Write-ColorLine "  ✓ PASS - Content correctly blocked" -Color $colors.Success
        Write-ColorLine "    Reason: $($body.reason)" -Color $colors.Muted
        Add-TestResult "Keyword Block (Harassment)" "PASS" "Blocked as expected" $body
    } else {
        Write-ColorLine "  ✗ FAIL - Content should have been blocked" -Color $colors.Error
        Add-TestResult "Keyword Block (Harassment)" "FAIL" "Expected block, got approval" $body
    }
} catch {
    Write-ColorLine "  ✗ ERROR - $($_.Exception.Message)" -Color $colors.Error
    Add-TestResult "Keyword Block (Harassment)" "ERROR" $_.Exception.Message ""
}

Write-Host ""

# Test 2: Keyword Block - Violence
Write-ColorLine "Test 2: Keyword Block (Violence)" -Color $colors.Info
try {
    $payload = @{
        title       = "Test Report 2"
        description = "This is violence and assault"
        media       = @()
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri $EndpointUrl `
        -Method POST `
        -ContentType "application/json" `
        -Body $payload `
        -TimeoutSec 15
    
    $body = $response.Content | ConvertFrom-Json
    
    if ($body.blocked -eq $true -or $body.status -eq "blocked") {
        Write-ColorLine "  ✓ PASS - Content correctly blocked" -Color $colors.Success
        Write-ColorLine "    Reason: $($body.reason)" -Color $colors.Muted
        Add-TestResult "Keyword Block (Violence)" "PASS" "Blocked as expected" $body
    } else {
        Write-ColorLine "  ✗ FAIL - Content should have been blocked" -Color $colors.Error
        Add-TestResult "Keyword Block (Violence)" "FAIL" "Expected block, got approval" $body
    }
} catch {
    Write-ColorLine "  ✗ ERROR - $($_.Exception.Message)" -Color $colors.Error
    Add-TestResult "Keyword Block (Violence)" "ERROR" $_.Exception.Message ""
}

Write-Host ""

# Test 3: Allowed Content (Clean)
Write-ColorLine "Test 3: Clean Content (Should Be Approved)" -Color $colors.Info
try {
    $payload = @{
        title       = "Test Report 3"
        description = "I really enjoyed today's campus event and the great activities"
        media       = @()
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri $EndpointUrl `
        -Method POST `
        -ContentType "application/json" `
        -Body $payload `
        -TimeoutSec 15
    
    $body = $response.Content | ConvertFrom-Json
    
    if ($body.blocked -eq $false -or $body.status -eq "approved") {
        Write-ColorLine "  ✓ PASS - Clean content correctly approved" -Color $colors.Success
        Add-TestResult "Clean Content (Approval)" "PASS" "Approved as expected" $body
    } else {
        Write-ColorLine "  ⚠ WARN - Clean content was blocked (may need policy review)" -Color $colors.Warning
        Add-TestResult "Clean Content (Approval)" "WARN" "Was blocked, expected approval" $body
    }
} catch {
    Write-ColorLine "  ✗ ERROR - $($_.Exception.Message)" -Color $colors.Error
    Add-TestResult "Clean Content (Approval)" "ERROR" $_.Exception.Message ""
}

Write-Host ""

# Test 4: Complex Text Analysis (Gemini)
Write-ColorLine "Test 4: Complex Content Analysis (Gemini)" -Color $colors.Info
try {
    $payload = @{
        title       = "Test Report 4"
        description = "I hate all students who support this policy, they should be expelled immediately"
        media       = @()
    } | ConvertTo-Json
    
    Write-ColorLine "  → Waiting for Gemini API response (3-8 seconds)..." -Color $colors.Info
    $startTime = Get-Date
    
    $response = Invoke-WebRequest -Uri $EndpointUrl `
        -Method POST `
        -ContentType "application/json" `
        -Body $payload `
        -TimeoutSec 15
    
    $elapsed = (Get-Date) - $startTime
    $body = $response.Content | ConvertFrom-Json
    
    if ($body.blocked -eq $true -or $body.status -eq "blocked") {
        Write-ColorLine "  ✓ PASS - Harmful content blocked by Gemini" -Color $colors.Success
        Write-ColorLine "    Time: $($elapsed.TotalSeconds)s" -Color $colors.Muted
        Write-ColorLine "    Reason: $($body.reason)" -Color $colors.Muted
        if ($body.PSObject.Properties.Name -contains 'aiProvider') {
            Write-ColorLine "    Provider: $($body.aiProvider)" -Color $colors.Muted
        }
        Add-TestResult "Complex Analysis (Gemini)" "PASS" "Blocked via Gemini, Time: $($elapsed.TotalSeconds)s" $body
    } else {
        Write-ColorLine "  ⚠ WARN - Content should have been flagged" -Color $colors.Warning
        Add-TestResult "Complex Analysis (Gemini)" "WARN" "Expected block from Gemini" $body
    }
} catch {
    Write-ColorLine "  ✗ ERROR - $($_.Exception.Message)" -Color $colors.Error
    Add-TestResult "Complex Analysis (Gemini)" "ERROR" $_.Exception.Message ""
}

Write-Host ""

# Test 5: Empty Content
Write-ColorLine "Test 5: Empty Content (Edge Case)" -Color $colors.Info
try {
    $payload = @{
        title       = ""
        description = ""
        media       = @()
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri $EndpointUrl `
        -Method POST `
        -ContentType "application/json" `
        -Body $payload `
        -TimeoutSec 15
    
    $body = $response.Content | ConvertFrom-Json
    
    if ($response.StatusCode -eq 200) {
        Write-ColorLine "  ✓ PASS - Empty content handled gracefully" -Color $colors.Success
        Write-ColorLine "    Response: $($body.reason)" -Color $colors.Muted
        Add-TestResult "Empty Content (Edge Case)" "PASS" "Handled gracefully" $body
    } else {
        Write-ColorLine "  ✗ FAIL - Should return 200 OK for empty content" -Color $colors.Error
        Add-TestResult "Empty Content (Edge Case)" "FAIL" "Expected 200, got $($response.StatusCode)" $body
    }
} catch {
    Write-ColorLine "  ⚠ WARN - Empty content error: $($_.Exception.Message)" -Color $colors.Warning
    Add-TestResult "Empty Content (Edge Case)" "WARN" $_.Exception.Message ""
}

Write-Host ""

# ============================================================================
# RESULTS SUMMARY
# ============================================================================

Write-ColorLine "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -Color $colors.Header
Write-ColorLine "Step 3: Test Results Summary" -Color $colors.Header
Write-ColorLine "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -Color $colors.Header
Write-Host ""

Write-ColorLine "Total Tests Run: $testCount" -Color $colors.Info
Write-ColorLine "Passed: $passCount" -Color $colors.Success
Write-ColorLine "Failed: $failCount" -Color $colors.Error

Write-Host ""
Write-ColorLine "Detailed Results:" -Color $colors.Info
Write-Host ""

$testResults | ForEach-Object {
    $statusColor = switch ($_.Status) {
        "PASS" { $colors.Success }
        "FAIL" { $colors.Error }
        "WARN" { $colors.Warning }
        "ERROR" { $colors.Error }
    }
    
    Write-ColorLine "$($_.Status.PadRight(5)) | $($_.Name)" -Color $statusColor
    Write-ColorLine "       └─ $($_.Message)" -Color $colors.Muted
}

Write-Host ""

# ============================================================================
# NEXT STEPS
# ============================================================================

Write-ColorLine "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -Color $colors.Header
Write-ColorLine "Next Steps" -Color $colors.Header
Write-ColorLine "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -Color $colors.Header
Write-Host ""

if ($failCount -gt 0) {
    Write-ColorLine "⚠️  Some tests failed. Check:" -Color $colors.Warning
    Write-Host ""
    Write-Host "1. Is the endpoint URL correct?" -ForegroundColor White
    Write-Host "2. Are API keys configured?" -ForegroundColor White
    Write-Host "   firebase functions:config:get" -ForegroundColor Gray
    Write-Host "3. Check Cloud Function logs:" -ForegroundColor White
    Write-Host "   firebase functions:log" -ForegroundColor Gray
    Write-Host "4. See TROUBLESHOOTING_SETUP.md for common issues" -ForegroundColor White
} else {
    Write-ColorLine "✓ All tests passed! AI moderation is working correctly." -Color $colors.Success
    Write-Host ""
    Write-Host "Next:" -ForegroundColor White
    Write-Host "1. Test on actual mobile app:" -ForegroundColor White
    Write-Host "   • Create a report with blocked keywords" -ForegroundColor Gray
    Write-Host "   • Check admin panel for moderation logs" -ForegroundColor Gray
    Write-Host "2. Monitor Firestore for logging" -ForegroundColor White
    Write-Host "   • Check moderationLogs collection" -ForegroundColor Gray
    Write-Host "3. Test image moderation manually" -ForegroundColor White
    Write-Host "   • Upload NSFW test image via mobile app" -ForegroundColor Gray
}

Write-Host ""
Write-ColorLine "See TESTING_AI_MODERATION.md for comprehensive testing guide" -Color $colors.Muted
Write-Host ""

# Exit with appropriate code
if ($failCount -gt 0) {
    exit 1
} else {
    exit 0
}
