# Firebase Security Rules Update for Usage Logs

## Issue
The admin web panel cannot fetch usage logs because Firebase Firestore security rules don't allow access to the `usageLogs` collection.

## Solution
Add the following rules to your Firebase Firestore Security Rules:

### Go to Firebase Console:
1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click on "Firestore Database" in the left sidebar
4. Click on the "Rules" tab
5. Add the rules below

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Existing rules for users, reports, etc. (keep your existing rules)
    
    // NEW: Usage Logs Collection Rules
    match /usageLogs/{logId} {
      // Allow mobile app to create usage logs (authenticated users)
      allow create: if request.auth != null;
      
      // Allow admins to read all usage logs
      allow read: if request.auth != null && (
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super_admin'
      );
      
      // Alternatively, if you want to allow any authenticated user to read their own logs:
      // allow read: if request.auth != null && 
      //   (resource.data.userId == request.auth.uid || 
      //    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'super_admin']);
    }
    
    // Keep all your other existing rules below...
  }
}
```

### Simplified Version (Less Secure, but easier for testing)

If you want to test quickly, you can use this simpler rule (NOT recommended for production):

```javascript
// Usage Logs - Allow authenticated users to write, admins to read
match /usageLogs/{logId} {
  allow create: if request.auth != null;
  allow read: if request.auth != null;
}
```

## Steps to Apply:

1. **Copy the rules** from above
2. **Open Firebase Console** → Your Project → Firestore Database → Rules
3. **Add the new `usageLogs` rules** to your existing rules file
4. **Click "Publish"** to save the changes
5. **Refresh the admin panel** and try fetching usage logs again

## Testing

After updating the rules:
1. Log out and log back into the admin panel
2. Navigate to "Usage Logs" menu
3. The logs should now load successfully
4. If you still see errors, check the browser console for detailed error messages

## Current Rule Structure Should Look Like:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    match /users/{userId} {
      // your existing user rules
    }
    
    match /reports/{reportId} {
      // your existing report rules
    }
    
    match /testFeedback/{feedbackId} {
      // your existing feedback rules
    }
    
    // ADD THIS NEW SECTION:
    match /usageLogs/{logId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && (
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super_admin'
      );
    }
  }
}
```

## Note
The usage logs will only appear after users actually use the app and log out. The logs are created when:
1. User logs in (initializes session)
2. User navigates through different features (tracks usage)
3. User logs out (completes and uploads the session log to Firebase)
