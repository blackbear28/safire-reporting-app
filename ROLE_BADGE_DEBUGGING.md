# 🐛 Role Badge Debugging Guide

## Issue
Role badges (Faculty 👨‍🏫 / Student 🎓) are not showing up on post cards in the feed.

## How It Should Work

### 1. User Registration
- When users sign up, they select their role (Student or Faculty) in `AccountSetupScreen`
- Role is saved to Firestore `users/{uid}` document at line 266 in `App.js`

### 2. Role Loading
- `AuthUserProvider` loads user data including role from Firestore (line 963 in `App.js`)
- Role is accessible via `userData.role` using the `useUser()` hook

### 3. Report Creation
- When creating a report in `ReportScreen.js` (line 223):
  ```javascript
  authorRole: isAnonymous ? null : (userData?.role || 'student')
  ```
- This saves the author's role to the report document

### 4. Badge Display
- `FeedItem` component in `HomeScreen.js` (lines 190-217) displays badges:
  - Faculty: Red badge (#ff6b6b) with 👨‍🏫 emoji
  - Student: Green badge (#51cf66) with 🎓 emoji
  - Only shows if `!item.anonymous && item.authorRole`

## Debug Logging Added

### In ReportScreen.js (lines 218-220):
```javascript
console.log('Current user data:', userData);
console.log('User role:', userData?.role);
```
**What to check:** When creating a post, verify the console shows your role (e.g., "User role: student")

### In HomeScreen.js (FeedItem component):
```javascript
console.log('Feed item data:', {
  id: item.id,
  anonymous: item.anonymous,
  authorRole: item.authorRole,
  authorName: item.authorName
});
```
**What to check:** This logs EVERY feed item to see which posts have `authorRole` field

## Testing Steps

### Step 1: Check Console Logs
1. Open React Native debugger or Expo logs
2. Create a NEW post (not anonymous)
3. Check console output:
   - Does it show your role? (e.g., "User role: student" or "User role: faculty")
   - If role is `undefined`, your user document doesn't have a role field

### Step 2: Check Feed Item Data
1. Look at the feed item logs in console
2. Check if posts have `authorRole` field:
   ```javascript
   // Has role badge:
   { id: '123', anonymous: false, authorRole: 'student', authorName: 'John' }
   
   // Missing role badge:
   { id: '456', anonymous: false, authorRole: undefined, authorName: 'Jane' }
   ```

### Step 3: Create Test Post
1. Make sure you're logged in (not anonymous)
2. Create a new report with any content
3. Submit the report
4. Check the feed - does the NEW post show a badge?

## Common Issues & Solutions

### Issue 1: Role is undefined in console
**Problem:** User document in Firestore doesn't have a `role` field

**Solutions:**
1. **For new users:** They will get the role during AccountSetup (it's required now)
2. **For existing users:** Add role field manually in Firebase Console:
   - Go to Firestore Database → `users` collection
   - Open your user document
   - Add field: `role` = `"student"` or `"faculty"`
   - Restart the app

### Issue 2: Existing posts don't have authorRole
**Problem:** Posts created before this feature was added don't have `authorRole` field

**This is EXPECTED behavior** - only new posts will show badges.

**Options:**
- **Option A (Easy):** Only new posts will have badges - this is fine
- **Option B (Migration):** Add `authorRole` to all existing posts (requires admin script)

### Issue 3: Badge shows for some posts but not others
**Check:**
- Is the post anonymous? (Anonymous posts never show badges)
- Was the post created before this feature? (Old posts don't have `authorRole`)
- Is the author's role undefined in their user document?

## Expected Console Output

### When creating a post:
```
Current user data: { uid: 'abc123', email: 'student@cjc.edu', role: 'student', ... }
User role: student
```

### When viewing feed:
```
Feed item data: { id: '1', anonymous: false, authorRole: 'student', authorName: 'John Doe' }
Feed item data: { id: '2', anonymous: true, authorRole: null, authorName: 'Anonymous' }
Feed item data: { id: '3', anonymous: false, authorRole: 'faculty', authorName: 'Prof. Smith' }
Feed item data: { id: '4', anonymous: false, authorRole: undefined, authorName: 'Old User' }
```

## Badge Appearance

### Student Badge
- Color: Green (#51cf66)
- Icon: 🎓
- Text: "STUDENT"
- Small, rounded corners

### Faculty Badge  
- Color: Red (#ff6b6b)
- Icon: 👨‍🏫
- Text: "FACULTY"
- Small, rounded corners

## Firebase Console Check

### To verify role in user document:
1. Open Firebase Console → Firestore Database
2. Navigate to `users` collection
3. Find your user document (search by email)
4. Check if `role` field exists and has value `"student"` or `"faculty"`

### To verify authorRole in posts:
1. Navigate to `reports` collection
2. Check recent posts
3. Look for `authorRole` field
4. Old posts will NOT have this field (that's normal)

## Quick Fix Summary

**If badges don't show:**

1. ✅ Check console logs (added debug statements)
2. ✅ Create a NEW post (old posts won't have badges)
3. ✅ Verify your user has a role in Firestore
4. ✅ Make sure post is NOT anonymous
5. ✅ Restart app after adding role to user document

**Remember:** This is a NEW feature - only posts created AFTER implementing this code will have role badges!

## Code Locations

- **Role saved during signup:** `App.js` line 266
- **Role loaded in UserContext:** `App.js` line 963  
- **Role added to report:** `ReportScreen.js` line 223
- **Badge displayed:** `HomeScreen.js` lines 190-217
- **Debug logs:** `ReportScreen.js` lines 218-220, `HomeScreen.js` FeedItem useEffect
