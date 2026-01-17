@echo off
echo ============================================
echo Deploying Firestore Security Rules
echo ============================================
echo.

echo Deploying rules to Firebase...
firebase deploy --only firestore:rules

echo.
echo ============================================
echo Deployment Complete!
echo ============================================
echo.
echo The messaging system should now work properly.
echo Try opening the Messages tab in the app.
echo.
pause
