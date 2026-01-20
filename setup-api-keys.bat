@echo off
echo ====================================
echo    API Keys Configuration Helper
echo ====================================
echo.

REM Check if .env files exist
set ENV_EXISTS=0
set ADMIN_ENV_EXISTS=0

if exist ".env" (
    set ENV_EXISTS=1
    echo [√] Mobile .env file exists
) else (
    echo [!] Mobile .env file NOT FOUND
)

if exist "admin-web\.env" (
    set ADMIN_ENV_EXISTS=1
    echo [√] Admin .env file exists
) else (
    echo [!] Admin .env file NOT FOUND
)

echo.
echo ====================================
echo    What would you like to do?
echo ====================================
echo.
echo 1. Create .env files from templates
echo 2. Edit mobile .env file
echo 3. Edit admin .env file
echo 4. View current configuration
echo 5. Test if keys are working
echo 7. Configure Firebase Functions secrets (server-side)
echo 6. Exit
echo.

set /p choice="Enter your choice (1-6): "

if "%choice%"=="1" goto create_env
if "%choice%"=="2" goto edit_mobile
if "%choice%"=="3" goto edit_admin
if "%choice%"=="4" goto view_config
if "%choice%"=="5" goto test_keys
if "%choice%"=="6" goto end
if "%choice%"=="7" goto configure_functions

:create_env
echo.
echo Creating .env files...
echo.

if not exist ".env" (
    if exist ".env.example" (
        copy .env.example .env
        echo [√] Created .env file in root directory
    ) else (
        echo # Environment Variables > .env
        echo # Add your API keys below >> .env
        echo. >> .env
        echo REACT_APP_GEMINI_API_KEY=your_gemini_api_key_here >> .env
        echo REACT_APP_HUGGINGFACE_TOKEN=your_huggingface_token_here >> .env
        echo [√] Created .env file (no template found, created blank)
    )
) else (
    echo [!] .env file already exists, skipping
)

if not exist "admin-web\.env" (
    if exist "admin-web\.env.example" (
        copy admin-web\.env.example admin-web\.env
        echo [√] Created admin-web\.env file
    ) else (
        echo # Environment Variables > admin-web\.env
        echo # Add your API keys below >> admin-web\.env
        echo. >> admin-web\.env
        echo REACT_APP_GEMINI_API_KEY=your_gemini_api_key_here >> admin-web\.env
        echo REACT_APP_HUGGINGFACE_TOKEN=your_huggingface_token_here >> admin-web\.env
        echo [√] Created admin-web\.env file (no template found, created blank)
    )
) else (
    echo [!] admin-web\.env file already exists, skipping
)

echo.
echo Files created! Now edit them to add your API keys.
echo.
pause
goto end

:edit_mobile
echo.
echo Opening mobile .env file...
notepad .env
goto end

:edit_admin
echo.
echo Opening admin .env file...
notepad admin-web\.env
goto end

:view_config
echo.
echo ====================================
echo    Current Configuration
echo ====================================
echo.

if exist ".env" (
    echo [MOBILE APP .env]
    type .env | findstr /V /C:"#"
) else (
    echo [!] Mobile .env not found
)

echo.

if exist "admin-web\.env" (
    echo [ADMIN PANEL .env]
    type admin-web\.env | findstr /V /C:"#"
) else (
    echo [!] Admin .env not found
)

echo.
echo ====================================
echo.
pause
goto end

:test_keys
echo.
echo ====================================
echo    Testing Configuration
echo ====================================
echo.

if exist ".env" (
    findstr /C:"REACT_APP_GEMINI_API_KEY" .env | findstr /V /C:"your_gemini_api_key_here" > nul
    if errorlevel 1 (
        echo [!] Gemini API key not configured in mobile .env
    ) else (
        echo [√] Gemini API key configured in mobile .env
    )
    
    findstr /C:"REACT_APP_HUGGINGFACE_TOKEN" .env | findstr /V /C:"your_huggingface_token_here" > nul
    if errorlevel 1 (
        echo [!] HuggingFace token not configured in mobile .env
    ) else (
        echo [√] HuggingFace token configured in mobile .env
    )
) else (
    echo [!] Mobile .env file not found
)

echo.

if exist "admin-web\.env" (
    findstr /C:"REACT_APP_GEMINI_API_KEY" admin-web\.env | findstr /V /C:"your_gemini_api_key_here" > nul
    if errorlevel 1 (
        echo [!] Gemini API key not configured in admin .env
    ) else (
        echo [√] Gemini API key configured in admin .env
    )
    
    findstr /C:"REACT_APP_HUGGINGFACE_TOKEN" admin-web\.env | findstr /V /C:"your_huggingface_token_here" > nul
    if errorlevel 1 (
        echo [!] HuggingFace token not configured in admin .env
    ) else (
        echo [√] HuggingFace token configured in admin .env
    )
) else (
    echo [!] Admin .env file not found
)

echo.
echo ====================================
echo.
echo Next steps:
echo 1. Get your API keys:
echo    - Gemini: https://makersuite.google.com/app/apikey
echo    - HuggingFace: https://huggingface.co/settings/tokens
echo.
echo 2. Edit .env files and paste your keys
echo.
echo 3. Restart your apps
echo.
pause
goto end

:configure_functions
echo.
echo ====================================
echo    Configure Firebase Functions Secrets
echo ====================================
echo.
echo This will run the Firebase CLI command to set server-side config for the moderation keys.
echo You must be logged in with `firebase login` and have the Firebase CLI installed.
echo.
set /p GEMINI="Enter your Gemini API key (or leave blank to cancel): "
if "%GEMINI%"=="" (
    echo Cancelled.
    goto end
)
set /p HFTOKEN="Enter your HuggingFace token (or leave blank to skip HF): "

echo Running: firebase functions:config:set moderation.gemini_key=*** moderation.hf_token=***
echo (keys will be sent to Firebase project configured in your current directory)

REM Build command
set CMD=firebase functions:config:set moderation.gemini_key="%GEMINI%"
if not "%HFTOKEN%"=="" set CMD=%CMD% moderation.hf_token="%HFTOKEN%"

echo Executing... (you may be prompted to login)
%CMD%

if errorlevel 1 (
    echo [!] Failed to set functions config. Ensure Firebase CLI is installed and you're logged in.
    echo You can manually run the following command:
    echo firebase functions:config:set moderation.gemini_key="YOUR_KEY" moderation.hf_token="YOUR_HF_TOKEN"
    pause
    goto end
)

echo [√] Server-side config set. Don't forget to deploy functions: `firebase deploy --only functions` from the `functions` folder.
pause
goto end

:end
echo.
echo Goodbye!
timeout /t 2 > nul
