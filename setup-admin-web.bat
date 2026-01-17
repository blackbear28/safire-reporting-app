@echo off
echo 🚀 Setting up Safire Admin Web Panel...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 16+ first.
    echo    Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js detected

REM Navigate to admin-web directory
if not exist "admin-web" (
    echo ❌ admin-web directory not found. Please run this script from the project root.
    pause
    exit /b 1
)

cd admin-web

echo 📦 Installing dependencies...
call npm install

if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully

echo 🔧 Checking Firebase configuration...
if not exist "src\firebase.js" (
    echo ❌ Firebase configuration not found. Please ensure src\firebase.js exists.
    pause
    exit /b 1
)

echo ✅ Firebase configuration found

echo.
echo 🎉 Setup complete! To start the admin panel:
echo.
echo    cd admin-web
echo    npm start
echo.
echo 📖 The admin panel will open at http://localhost:3000
echo 🔐 Make sure you have admin or super_admin role in Firestore to access the panel
echo.
echo 📚 Read admin-web\README.md for detailed setup instructions
echo.
pause
