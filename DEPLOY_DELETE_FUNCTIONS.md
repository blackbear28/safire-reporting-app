# Deploy User Deletion Cloud Functions

## Quick Setup (5 minutes)

### Step 1: Install Firebase Tools
```powershell
npm install -g firebase-tools
```

### Step 2: Login to Firebase
```powershell
firebase login
```

### Step 3: Initialize Firebase (if not done)
```powershell
cd d:\safire-reporting-app-main
firebase init
```

Select:
- ✅ Functions
- Choose existing project: campulse-8c50e
- Language: JavaScript
- ESLint: No (optional)
- Install dependencies: Yes

### Step 4: Install Function Dependencies
```powershell
cd functions
npm install
```

### Step 5: Deploy Functions
```powershell
npm run deploy
```

Or:
```powershell
firebase deploy --only functions
```

## What Gets Deployed

Two Cloud Functions:

1. **deleteUserAuth** - Automatic trigger
   - Runs when user doc deleted from Firestore
   - Deletes Firebase Auth account automatically
   
2. **deleteUserCompletely** - Callable function (optional)
   - Can be called directly from admin panel
   - Deletes everything in one call

## After Deployment

### Test It

1. Go to admin web panel
2. Click delete on a test user
3. Check Firebase Console → Functions → Logs
4. Verify:
   - ✅ User deleted from Firestore
   - ✅ User deleted from Authentication  
   - ✅ Profile pics deleted from Supabase
   - ✅ Reports deleted

### Monitor Functions

**Firebase Console:**
- Functions → Dashboard → deleteUserAuth
- View invocations, errors, execution time

**Command line:**
```powershell
firebase functions:log
```

## Pricing

**Free Tier (Spark plan won't work for Cloud Functions)**

You need **Blaze (Pay as you go)** plan:
- First 2M invocations/month: FREE
- First 400,000 GB-seconds/month: FREE
- First 200,000 GHz-seconds/month: FREE

**Expected cost for this app:** $0-1/month

## Upgrade to Blaze Plan

1. Firebase Console → Project Settings
2. Usage and billing → Modify plan
3. Select Blaze plan
4. Add payment method
5. Set budget alert (e.g., $5/month)

## Troubleshooting

**Error: "Cloud Functions requires Blaze plan"**
- Upgrade to Blaze plan (see above)

**Error: "Permission denied"**
- Run: `firebase login` again
- Verify you have owner/editor role on project

**Function not deploying:**
```powershell
# Clear node_modules and reinstall
cd functions
Remove-Item node_modules -Recurse -Force
npm install
npm run deploy
```

**Function deployed but not working:**
- Check Firebase Console → Functions → Logs
- Look for error messages
- Verify Firestore rules allow deletions

## Alternative: Manual Auth Deletion

If you can't deploy Cloud Functions:

**Option 1:** Delete from Firebase Console manually
1. Firebase Console → Authentication → Users
2. Find user by email
3. Click ... → Delete user

**Option 2:** Keep using admin panel (partial deletion)
- Deletes Firestore + Supabase  
- You manually delete Auth users weekly

## Next Steps

Once deployed:
1. Test with a dummy user
2. Monitor logs for 24 hours
3. Set up budget alerts
4. Document for your team

## Support

If functions don't deploy, share the error and I'll help debug!
