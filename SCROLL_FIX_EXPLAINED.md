# Scroll Position Reset Fix

## Problem
The app was scrolling back to the top whenever users interacted with elements like:
- Upvoting posts
- Searching for content
- Applying filters
- Any action that updated state

This created a poor user experience, unlike typical social media apps where interactions happen without losing scroll position.

## Root Cause
The issue was caused by unnecessary re-renders of the entire feed:

1. **State Updates Trigger Full Re-renders**: When `userUpvotes`, `feed`, or `searchQuery` changed, the entire feed component re-rendered
2. **Function Recreation**: Event handlers like `handleUpvote` and `handlePostPress` were being recreated on every render, causing child components to see them as "new" props
3. **No Memoization**: Feed items weren't memoized, so every item re-rendered even if its data hadn't changed

## Solution Applied

### 1. Added React.useCallback to Event Handlers
Wrapped key functions to prevent recreation on every render:

```javascript
// Before
const handleUpvote = async (reportId, currentUserId) => { ... };

// After
const handleUpvote = useCallback(async (reportId, currentUserId) => {
  // ...same logic
}, [userUpvotes]);
```

Applied to:
- `handleUpvote` - upvoting posts
- `handlePostPress` - opening post details
- `handleViewReport` - tracking views
- `getTimeAgo`, `getStatusColor`, `getCategoryColor`, `getPriorityColor` - all helper functions

### 2. Created Memoized FeedItem Component
Created a separate `FeedItem` component wrapped in `React.memo` with custom comparison:

```javascript
const FeedItem = React.memo(({ 
  item, 
  // ...other props
}) => (
  // Feed item JSX
), (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return prevProps.item.id === nextProps.item.id &&
         prevProps.item.upvotes === nextProps.item.upvotes &&
         prevProps.userUpvotes[prevProps.item.id] === nextProps.userUpvotes[nextProps.item.id] &&
         prevProps.colors === nextProps.colors;
});
```

### 3. Optimized Firestore Subscription
Added smart comparison in feed subscription to prevent updates when data hasn't actually changed:

```javascript
setFeed(prevFeed => {
  // Check if reports are actually different
  const hasChanges = /* comparison logic */;
  return hasChanges ? reports : prevFeed;
});
```

### 4. Converted to FlatList
Replaced `.map()` with `FlatList` for better scroll position maintenance:

```javascript
<FlatList
  data={filteredFeed}
  renderItem={({ item }) => <FeedItem item={item} {...props} />}
  keyExtractor={(item) => item.id}
  maintainVisibleContentPosition={{
    minIndexForVisible: 0,
    autoscrollToTopThreshold: 10
  }}
/>
```

## Benefits

1. **Preserved Scroll Position**: Users stay where they are when interacting
2. **Better Performance**: Only changed items re-render instead of the entire feed
3. **Smooth Interactions**: Upvotes feel instantaneous without scroll jumps
4. **Reduced Renders**: Fewer unnecessary component updates
5. **Social Media UX**: Matches expected behavior from apps like Twitter, Instagram, Facebook

---

# Usage Logger Updates

## Media Tracking Enhancement

The usage logger now accurately detects when users try to use media upload features even though Firebase Storage isn't configured yet.

### Changes:

1. **New Feature Types**:
   - `SUBMIT_REPORT` - Incident Report (text only)
   - `SUBMIT_REPORT_WITH_MEDIA` - Incident + Media (when media is successfully included)
   - `MEDIA_ATTEMPTED_NO_STORAGE` - User tried to upload media but Firebase Storage not configured

2. **Automatic Detection**:
   - When user picks/takes a photo, logger records the attempt
   - Shows alert that Firebase Storage isn't set up yet
   - Logs show: "User attempted to upload X media file(s) but Firebase Storage is not configured"

3. **Enhanced Log Output**:
```
3. Media Upload Attempted (No Firebase Storage)
   Start time: 1/17/2026, 3:45:23 PM
   End time: 1/17/2026, 3:45:25 PM
   Time (minutes): 0.03
   Success: Attempted but Firebase Storage not configured
   Problem/Issues: Firebase Storage not set up - media upload unavailable
   ⚠️ Note: User attempted to upload 1 media file(s) but Firebase Storage is not configured
   ⚠️ System Status: Media upload unavailable (Firebase Storage not set up)
```

### Benefits:
- ✅ Accurate tracking of feature attempts vs actual usage
- ✅ Clear documentation that media feature exists but needs setup
- ✅ Users are informed about Firebase Storage requirement
- ✅ Test logs show realistic user behavior and system limitations
