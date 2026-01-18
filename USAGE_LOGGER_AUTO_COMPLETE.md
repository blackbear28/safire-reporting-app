# Usage Logger Auto-Complete Feature

## What Changed?

The usage logger now **automatically saves session data to Firebase immediately** when users close the app without logging out! The logs appear in the admin panel right away.

## How It Works - Step by Step

1. **User logs in** → Usage logger session starts
2. **User uses features** → All activity tracked in real-time
3. **User closes app (without logout)** → IMMEDIATELY:
   - App detects background state
   - Auto-saves session to Firebase
   - **Log appears in admin panel instantly! ✓**
4. **OR User inactive 30+ minutes** → Auto-saves to Firebase
5. **OR User clicks logout** → Manual save to Firebase

## Admin Panel Updates

The Usage Logs section now shows:

### Visual Indicators:
- **🤖 Auto** badge - Shows when session was auto-completed
- **Completion reason** displayed (e.g., "App closed or backgrounded")
- Different from manual logout sessions

### Example Display:
```
┌─────────────────────────────────────┐
│ USER123         [User] [🤖 Auto]   │
├─────────────────────────────────────┤
│ Email: user@g.cjc.edu.ph           │
│ Session Start: Jan 18, 2026 10:00 │
│ Session End: Jan 18, 2026 10:45    │
│ Total Duration: 45.5 min           │
│ Features Used: 8                   │
│ 📱 App closed or backgrounded      │
└─────────────────────────────────────┘
```

### 1. **App Background Detection**
- Automatically detects when the app goes to background or becomes inactive
- Saves the session immediately when user closes the app
- Session is marked as `autoCompleted: true` with reason: "App closed or backgrounded"

### 2. **Inactivity Detection**
- Monitors user activity continuously
- If user is inactive for **30 minutes**, automatically saves the session
- Session is marked as `autoCompleted: true` with reason: "User inactive for 30+ minutes"

### 3. **Activity Tracking**
- Updates last activity time whenever user starts or ends a feature
- Tracks when user last interacted with the app

### 4. **Session Resume**
- If app is reopened before session is uploaded, it resumes the previous session
- No data loss even if user switches between apps

## How It Works

```
User logs in → Session starts
  ↓
User uses features → Activity tracked
  ↓
User closes app (without logout) → Auto-saves to Firebase ✓
  OR
User inactive 30+ min → Auto-saves to Firebase ✓
  OR
User clicks logout → Manual save to Firebase ✓
```

## Firebase Data Structure

Each usage log now includes:

```javascript
{
  testUserCode: "USER123",
  userId: "firebase-uid",
  userEmail: "user@example.com",
  sessionStartTime: "2026-01-18T10:00:00Z",
  sessionEndTime: "2026-01-18T10:45:00Z",
  totalDurationMinutes: 45.5,
  logs: [...feature usage logs...],
  autoCompleted: true/false,  // NEW!
  completionReason: "App closed or backgrounded" // NEW!
                  // or "User inactive for 30+ minutes"
                  // or "Manual logout"
}
```

## Benefits

✅ **No More Lost Data** - Even lazy users who don't logout get their data saved
✅ **Better Analytics** - Capture real usage patterns
✅ **Battery Efficient** - Checks inactivity only once per minute
✅ **Background Safe** - Works with iOS/Android app lifecycle

## Technical Implementation

- Uses React Native's `AppState` API to detect background/foreground
- Inactivity timer checks every 60 seconds
- 30-minute inactivity threshold (configurable)
- Saves to AsyncStorage continuously for recovery
- Auto-uploads to Firebase when app backgrounds

## No Breaking Changes

- Existing manual logout still works the same
- All previous features remain unchanged
- Admin dashboard will show both auto and manual completions
