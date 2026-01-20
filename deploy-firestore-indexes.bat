@echo off
echo ====================================
echo   Deploying Firestore Indexes
echo ====================================
echo.
echo This will deploy the indexes defined in firestore.indexes.json
echo.
pause

firebase deploy --only firestore:indexes

if errorlevel 1 (
    echo.
    echo ====================================
    echo   Deployment Failed
    echo ====================================
    echo.
    echo If you see authentication errors, try:
    echo   firebase login
    echo.
    echo Or create the index manually:
    echo 1. Go to: https://console.firebase.google.com/project/campulse-8c50e/firestore/indexes
    echo 2. Click "Create Index"
    echo 3. Collection: reports
    echo 4. Fields: userId (Ascending), createdAt (Descending)
    echo.
) else (
    echo.
    echo ====================================
    echo   Deployment Successful!
    echo ====================================
    echo.
    echo Wait 1-2 minutes for indexes to build, then try AI Check again.
    echo.
)

pause
