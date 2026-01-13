@echo off
echo ========================================
echo    Safire Mobile App Startup Script
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ERROR: package.json not found!
    echo Make sure you're running this script from the main project directory
    echo (the folder that contains App.js, package.json, etc.)
    echo.
    pause
    exit /b 1
)

echo ✓ Found package.json - we're in the right directory
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
    echo ✓ Dependencies installed successfully
) else (
    echo ✓ Dependencies already installed
)

echo.
echo Starting Expo development server...
echo.
echo Instructions:
echo 1. Make sure you have Expo Go app installed on your phone
echo 2. Scan the QR code that appears with your phone camera
echo 3. The app should open in Expo Go
echo.

REM Start the Expo server
call npx expo start

pause
