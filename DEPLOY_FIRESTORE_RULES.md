# Deploying Firestore Security Rules

## Error
You're getting "Missing or insufficient permissions" because Firestore security rules don't exist for the new `conversations` collection.

## Solution
Run this command to deploy the security rules:

```bash
firebase deploy --only firestore:rules
```

Or simply run:
```bash
./deploy-firestore-rules.bat
```

## What the rules allow:
✅ Users can create and read their own conversations
✅ Users can send and receive messages in their conversations
✅ Admins can read all conversations and messages
✅ Messages are automatically marked as read
✅ Proper security for user data

## After deployment:
1. Restart your app
2. Open the Messages tab
3. Click "Start Conversation"
4. You should now be able to chat with admin support!

The rules file is located at: `firestore.rules`
