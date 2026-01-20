# AI Moderation Testing Guide

## 🧪 Complete Testing Workflow

This guide will help you verify that the AI moderation system is working correctly for both text and image detection.

---

## ✅ Prerequisites

Before testing, ensure:

1. **Cloud Function Deployed**
   ```bash
   firebase functions:list
   # Should show: ✔  moderationAnalyze
   ```

2. **API Keys Configured**
   ```bash
   firebase functions:config:get
   # Should show moderation.gemini_key and moderation.hf_token
   ```

3. **Endpoint URL in .env Files**
   ```bash
   # Root .env should have:
   REACT_APP_MODERATION_ENDPOINT=https://us-central1-YOUR-PROJECT.cloudfunctions.net/moderationAnalyze
   
   # admin-web/.env should have same URL
   ```

4. **Apps Running**
   - Mobile: `npm start` (in root directory)
   - Admin: `cd admin-web && npm start`

---

## 🧪 Test Type 1: Text Moderation (Keyword Blocking)

### Test Case: Instant Keyword Detection

**What it tests**: Quick pre-check that blocks harmful keywords without API calls

**Steps**:

1. **Open mobile app** and create a new report
2. **Type in "Post Description"**: `This is harassment`
3. **Submit the report**

**Expected Result**:
- ✅ Red rejection popup appears immediately (within 1 second)
- ✅ Message: "Post contains prohibited content: harassment detected"
- ✅ Post does NOT appear in feed
- ✅ NO post/report created in Firestore

**Why instant?**: Keyword check happens before any API calls, so response is <100ms

---

## 🧪 Test Type 2: Text Moderation (Gemini Analysis)

### Test Case: Complex Content Analysis

**What it tests**: Google Gemini API analyzing content for context-aware violations

**Steps**:

1. **Open mobile app** and create a new report
2. **Type complex text**: `I hate all students who support this policy, they're so stupid and should be expelled`
3. **Submit the report**

**Expected Result**:
- ✅ Rejection popup appears (3-8 seconds - API call time)
- ✅ Message includes risk level (e.g., "HIGH RISK")
- ✅ Shows violation type (e.g., "Hate speech, Bullying")
- ✅ Confidence score displayed

**Verify in Firestore**:
```
Collection: moderationLogs
Look for entry with:
- content: "I hate all students..."
- status: "blocked"
- aiProvider: "gemini"
- violationType: "hate_speech, bullying"
- riskLevel: "high"
```

---

## 🧪 Test Type 3: Image Moderation (NSFW Detection)

### Test Case: Image Detection via HuggingFace

**What it tests**: NSFW/harmful image detection

**Steps**:

1. **Open mobile app** and create a report
2. **Attach an image**:
   - ✅ Use a test NSFW image (search "nsfw test image")
   - ❌ Don't use actual illegal content
3. **Add description**: `Check this image`
4. **Submit**

**Expected Result**:
- ✅ Image upload completes
- ✅ Rejection popup appears (5-10 seconds - HuggingFace API)
- ✅ Message: "Image flagged as inappropriate"
- ✅ Confidence score shown (e.g., "NSFW confidence: 0.85")
- ✅ Image NOT stored to Supabase

**Verify in Firestore**:
```
Collection: moderationLogs
Look for entry with:
- hasMedia: true
- status: "blocked"
- aiProvider: "huggingface"
- imageConfidence: 0.85 (or similar)
- violationType: "nsfw_image"
```

---

## 🧪 Test Type 4: Multiple Detections

### Test Case: Both Text AND Image Violations

**What it tests**: System handling combined violations

**Steps**:

1. **Create a report** with:
   - Text: `This is bullying behavior`
   - Image: NSFW test image
2. **Submit**

**Expected Result**:
- ✅ Rejected on first violation (whichever is checked first)
- ✅ Both violations logged to Firestore
- ✅ Rejection message includes both reasons

---

## 🧪 Test Type 5: Allowed Content (Pass-Through)

### Test Case: Content That Should Be Allowed

**What it tests**: Legitimate content passes through

**Steps**:

1. **Create a report** with:
   - Text: `I really enjoyed today's campus event`
   - No image (or safe image)
2. **Submit**

**Expected Result**:
- ✅ ✔️ Approval popup appears
- ✅ Message: "Content approved for posting"
- ✅ Post appears in feed
- ✅ Entry in Firestore `posts` collection
- ✅ Firestore log shows: `status: "approved"`

---

## 📊 Checking Results in Firestore

### 1. **Via Firebase Console**

1. Open [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Firestore Database**
4. Click **Collections**
5. Find `moderationLogs` collection
6. View recent documents

**What to look for**:
```json
{
  "userId": "user123",
  "content": "This is harassment",
  "status": "blocked",
  "reason": "Keyword blocklist match",
  "violationType": "harassment",
  "aiProvider": "keyword_check",
  "confidence": 1.0,
  "timestamp": "2026-01-20T14:30:00Z",
  "action": "reject"
}
```

### 2. **Via Admin Panel**

1. Open admin web app: `http://localhost:3000`
2. Go to **Moderation** → **Moderation Logs**
3. You should see entries for each test case
4. Click entry to see full details

**What you'll see**:
- Content analyzed
- Violation type
- Risk level
- Confidence score
- Timestamp
- User information

---

## 🔍 Advanced Testing: Cloud Function Logs

### View Real-Time Function Execution

```bash
# Watch Cloud Function logs in real-time
firebase functions:log

# Or use gcloud
gcloud functions logs read moderationAnalyze --limit 50 --follow
```

**Expected Log Output**:
```
2026-01-20T14:30:00.000Z
Function execution started
- Input validation: PASSED
- Quick precheck: MATCH (harassment keyword)
- Firestore log: WRITTEN
- Post status: UPDATED to rejected
- Response: 200 OK (blocked)

Execution completed
```

---

## 🧪 Testing Checklist

Run through this entire checklist to verify complete functionality:

### Text Moderation
- [ ] Test 1: Submit "harassment" → rejected instantly
- [ ] Test 2: Submit "violence" → rejected instantly
- [ ] Test 3: Submit complex bullying text → rejected via Gemini
- [ ] Test 4: Submit clean text → approved
- [ ] Test 5: Verify logs in Firestore

### Image Moderation
- [ ] Test 6: Upload safe image → approved
- [ ] Test 7: Upload NSFW test image → rejected via HuggingFace
- [ ] Test 8: Verify image confidence scores in logs
- [ ] Test 9: Verify image NOT stored in Supabase

### Integration
- [ ] Test 10: Mobile app shows rejection popup
- [ ] Test 11: Admin panel shows all logs
- [ ] Test 12: Firestore logs are accurate
- [ ] Test 13: Posts collection updated correctly
- [ ] Test 14: Reports collection updated correctly

### Edge Cases
- [ ] Test 15: Mixed text + image (both violations)
- [ ] Test 16: Empty/null content handling
- [ ] Test 17: API timeout simulation
- [ ] Test 18: Invalid image file format

---

## ⚠️ What to Do If Tests Fail

### "Rejected Content But Not Logged"
- Check: Firestore `moderationLogs` collection exists
- Check: Cloud Function has Firestore write permissions
- View: `firebase functions:log` for errors

### "No Rejection, Content Passes Through"
- Check: Is endpoint URL correct in .env?
- Check: Is Cloud Function deployed? (`firebase functions:list`)
- Check: Are API keys set? (`firebase functions:config:get`)
- Logs: `firebase functions:log`

### "API Key Error"
```
Error: "API key not configured"
```
- Fix: Run `firebase functions:config:set moderation.gemini_key="YOUR_KEY" moderation.hf_token="YOUR_TOKEN"`
- Verify: `firebase functions:config:get`
- Redeploy: `firebase deploy --only functions`

### "Timeout (Content Takes >10 seconds)"
- Check: Network connection
- Check: API keys are valid (test in browser console)
- Check: Cloud Function runtime logs for slow operations

### "Image Upload Succeeds but No Analysis"
- Check: HuggingFace token valid at https://huggingface.co/settings/tokens
- Check: Image URL is accessible
- Logs: Look for "callHfImageModeration" in Firebase logs

---

## 📱 Testing on Actual Devices

### iOS (via Expo)
```bash
# Scan QR code from terminal
npm start
# Follow on-screen instructions for iOS
```

### Android (via Expo)
```bash
# Same as iOS
npm start
# When app opens, press 'i' for iOS or 'a' for Android
```

### Direct Firebase Emulation
```bash
# Test Cloud Function locally before deploy
firebase emulators:start --only functions

# In another terminal, test via HTTP:
curl -X POST http://localhost:5001/PROJECT_ID/us-central1/moderationAnalyze \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Post",
    "description": "This is harassment",
    "media": []
  }'
```

---

## 🎯 Success Indicators

When everything is working correctly, you'll see:

✅ **Immediate Response** (Keyword Blocks)
- Red popup within 1 second
- No API delays
- Content rejected

✅ **API Response** (Text/Image Analysis)
- Popup within 3-10 seconds
- Includes violation type
- Shows confidence score
- Post appears in logs

✅ **Firestore Logging**
- `moderationLogs` collection populated
- `posts` collection has `aiModerated: true`
- Timestamps correct
- User/content references accurate

✅ **Admin Visibility**
- Logs visible in admin panel
- Can view full details
- Can manually re-analyze
- Historical tracking works

---

## 🐛 Debugging Tips

### Enable Verbose Logging (Development)
Add to `functions/moderationAnalyze.js`:
```javascript
console.log('DEBUG: Input validation passed');
console.log('DEBUG: Quick precheck result:', quickPreCheckResult);
console.log('DEBUG: Gemini response:', geminiResponse);
```

Then view with:
```bash
firebase functions:log --lines 100
```

### Test Individual Components
See `test-moderation-http.js` in root directory for HTTP testing harness.

### Check Rate Limits
Gemini free tier: 60 requests/minute
HuggingFace free tier: Rate limited by queue

If you exceed limits, you'll see:
```
429 Too Many Requests
```

Wait a minute and retry.

---

## 📊 Expected Performance

| Test Type | Response Time | Result |
|-----------|---|---|
| Keyword block | <1 second | Immediate rejection |
| Gemini text | 3-8 seconds | Detailed analysis |
| HuggingFace image | 5-10 seconds | Confidence score |
| Firestore log | <1 second | Entry created |
| Admin view | <2 seconds | Logs displayed |

---

## ✅ Ready to Test?

1. **Start here**: Run this command to verify setup
   ```bash
   firebase functions:config:get
   ```
   
2. **Then**: Follow Test Type 1 above with "harassment" keyword

3. **Observe**: Check mobile app rejection + Firestore logs

4. **Troubleshoot**: Use debugging section if needed

**Questions?** Check `DEPLOY_MODERATION.md` or `TROUBLESHOOTING_SETUP.md`

