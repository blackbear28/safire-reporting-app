@echo off
REM Deployment checklist and guide for SAFIRE Moderation System
REM Run this to verify everything is ready and guide you through deployment

echo.
echo ==========================================
echo  SAFIRE AI Moderation Deployment Guide
echo ==========================================
echo.

REM Check 1: Firebase CLI
echo 1. Checking Firebase CLI...
where firebase >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Firebase CLI is installed
) else (
    echo [ERROR] Firebase CLI not found
    echo Install with: npm install -g firebase-tools
    pause
    exit /b 1
)

REM Check 2: Node.js
echo.
echo 2. Checking Node.js...
node --version >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo [OK] Node version: %NODE_VERSION%
) else (
    echo [ERROR] Node.js not found
    pause
    exit /b 1
)

REM Check 3: Firebase config
echo.
echo 3. Checking Firebase configuration...
if exist ".firebaserc" (
    echo [OK] Firebase project configured
) else (
    echo [ERROR] .firebaserc not found
    echo Run: firebase init
    pause
    exit /b 1
)

REM Check 4: Functions directory
echo.
echo 4. Checking Cloud Functions...
if exist "functions\moderationAnalyze.js" (
    echo [OK] moderationAnalyze.js found
) else (
    echo [ERROR] moderationAnalyze.js not found
    pause
    exit /b 1
)

REM Check 5: Environment files
echo.
echo 5. Checking environment files...
if exist ".env" (
    echo [OK] Root .env file exists
) else (
    echo [!] Root .env not found - you'll create it in the next steps
)

if exist "admin-web\.env" (
    echo [OK] Admin .env file exists
) else (
    echo [!] Admin .env not found - you'll create it in the next steps
)

REM Summary
echo.
echo ==========================================
echo  Pre-deployment checks complete!
echo ==========================================
echo.
echo NEXT STEPS:
echo.
echo 1. Gather your API Keys:
echo    - Gemini API Key: https://makersuite.google.com/app/apikey
echo    - HuggingFace Token: https://huggingface.co/settings/tokens
echo.
echo 2. Set Firebase Functions config:
echo    Open PowerShell or Command Prompt and run:
echo.
echo    firebase functions:config:set ^
echo      moderation.gemini_key="YOUR_GEMINI_KEY" ^
echo      moderation.hf_token="YOUR_HF_TOKEN"
echo.
echo 3. Deploy Cloud Function:
echo.
echo    cd functions
echo    npm install
echo    firebase deploy --only functions
echo.
echo 4. Copy function URL from deploy output and add to .env files
echo.
echo 5. Restart the apps (npm start)
echo.
echo For detailed instructions, see DEPLOY_MODERATION.md
echo.
pause
