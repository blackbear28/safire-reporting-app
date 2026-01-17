# SAFIRE Cloud Functions

Firebase Cloud Functions for SAFIRE app automation.

## Functions

### 1. `deleteUserAuth` (Firestore Trigger)
Automatically deletes user from Firebase Authentication when their Firestore document is deleted.

**Trigger:** `users/{userId}` document deletion

**What it does:**
- Listens for user document deletions in Firestore
- Automatically deletes the corresponding Firebase Auth account
- Logs success/failure

### 2. `deleteUserCompletely` (Callable Function)
Completely deletes a user including all their data.

**How to call from admin panel:**
```javascript
const deleteUser = httpsCallable(functions, 'deleteUserCompletely');
const result = await deleteUser({ userId: 'user-id-here' });
```

**What it deletes:**
- Firebase Authentication account
- Firestore user document  
- All user's reports
- (Profile images handled by admin panel)

## Setup

### Prerequisites
- Firebase CLI installed: `npm install -g firebase-tools`
- Firebase project initialized
- Node.js 18+

### Installation

1. **Install dependencies:**
```bash
cd functions
npm install
```

2. **Initialize Firebase (if not already done):**
```bash
firebase init functions
```

3. **Deploy functions:**
```bash
npm run deploy
```

Or deploy specific function:
```bash
firebase deploy --only functions:deleteUserAuth
firebase deploy --only functions:deleteUserCompletely
```

### Local Testing

Start Firebase emulators:
```bash
npm run serve
```

### Configuration

**Required Firebase settings:**
- Firestore database enabled
- Firebase Authentication enabled
- Cloud Functions enabled (Blaze plan required)

### Security

- `deleteUserCompletely` requires authentication
- Only authenticated admins can call the function
- Add additional role-based checks as needed

## Usage from Admin Panel

The admin panel will automatically use these functions when you click "Delete User":

1. Admin clicks delete button
2. Confirmation dialog appears
3. On confirm:
   - Profile images deleted from Supabase
   - Firestore user document deleted
   - Cloud Function `deleteUserAuth` automatically triggers
   - Firebase Auth account deleted
   - All reports deleted

## Monitoring

View function logs:
```bash
npm run logs
```

Or in Firebase Console:
- Functions → Logs

## Cost

Cloud Functions are billed based on:
- Invocations
- Compute time
- Networking

Expected cost: Very low (few cents per month for typical usage)

Free tier: 2M invocations/month

## Troubleshooting

**Function not triggering:**
- Check Firebase Console → Functions → Logs
- Verify function is deployed
- Check Firestore security rules

**Permission errors:**
- Ensure Firebase Admin SDK is initialized
- Check IAM permissions in Google Cloud Console

**Authentication errors:**
- Verify user is authenticated when calling `deleteUserCompletely`
- Check Firebase Auth configuration
