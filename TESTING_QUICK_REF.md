# AI Moderation Testing - Quick Start

## 🚀 Test in 5 Minutes

### 1. Verify Setup
```bash
firebase functions:config:get
# Should show: moderation.gemini_key and moderation.hf_token
```

### 2. Run Automated Tests
```powershell
# Windows
.\test-ai-moderation.ps1

# Or with endpoint URL:
.\test-ai-moderation.ps1 -EndpointUrl "https://us-central1-YOUR-PROJECT.cloudfunctions.net/moderationAnalyze"
```

### 3. Check Results
You'll see:
- ✅ PASS - Tests that worked
- ❌ FAIL - Tests that failed  
- ⚠️ WARN - Tests with issues

---

## 🧪 Manual Testing (Step-by-Step)

### Test Text Blocking (Instant)
1. Open mobile app
2. Create report with text: **`This is harassment`**
3. Click submit
4. **Expected**: Red popup in <1 second saying "blocked"

### Test Image Detection (5-10 seconds)
1. Open mobile app
2. Create report
3. Upload **NSFW test image**
4. Add description: `Check this`
5. Click submit
6. **Expected**: Red popup after 5-10s saying image flagged

### Test Clean Content (Approved)
1. Open mobile app
2. Create report with: **`I enjoyed the campus event`**
3. Click submit
4. **Expected**: Green popup saying "approved" and post appears

---

## 📊 Where to See Results

### In Mobile App
- **Red popup** = Content blocked (immediately or after API analysis)
- **Green popup** = Content approved
- Shows reason and confidence score

### In Admin Panel
1. Go to **Moderation** → **Moderation Logs**
2. See all analyzed content
3. Click entry to see full details:
   - Violation type
   - Confidence score
   - AI provider (keyword/gemini/huggingface)
   - Timestamp

### In Firestore Console
Open [Firebase Console](https://console.firebase.google.com):
1. Firestore Database
2. Collections → `moderationLogs`
3. View entries with:
   - `status: "blocked"` or `"approved"`
   - `violationType: "harassment"`, `"violence"`, etc.
   - `confidence: 0.85` (0-1 scale)

---

## ⚡ Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| "Endpoint unreachable" | Check .env has correct URL |
| "API key not configured" | Run `firebase functions:config:set` |
| "Takes >15 seconds" | Network issue or API rate limit |
| "No rejection for bad content" | Check function deployed: `firebase functions:list` |
| "Logs not appearing" | Check Firestore rules allow writes |

---

## 🎯 What Each Test Does

| Test | Input | Expected |
|------|-------|----------|
| **Keyword Block** | "harassment" | ✅ Blocked instantly |
| **Keyword Block** | "violence" | ✅ Blocked instantly |
| **Clean Content** | "enjoyed event" | ✅ Approved |
| **Gemini Analysis** | Complex bullying text | ✅ Blocked (5-8s) |
| **Empty Content** | Empty fields | ✅ Handled gracefully |

---

## 📱 Mobile App Testing

### Create a Test Report

**Menu: Report → New Report**

```
Title: [anything]
Description: "This is harassment"  ← Try different blocked keywords
Category: [any]
Image: [optional]
Location: [any]
```

**Submit** → See instant rejection

---

## 🔍 Check Moderation Logs (Admin Panel)

1. Open: `http://localhost:3000`
2. Login as admin
3. Navigate: **Moderation → Moderation Logs** (or Reports → Analyze with AI)
4. View entries with:
   - User who created report
   - Content analyzed
   - Violation found (harassment, violence, etc)
   - Risk level (LOW, MEDIUM, HIGH)
   - Confidence score
   - Timestamp

---

## ⏱️ Expected Performance

| Check Type | Response Time |
|-----------|---|
| Keyword block | <1 second |
| Text analysis (Gemini) | 3-8 seconds |
| Image analysis (HuggingFace) | 5-10 seconds |
| Log entry created | <1 second |
| Admin panel displays | <2 seconds |

---

## 🎬 Full Testing Workflow

```
1. Deploy function
   firebase deploy --only functions
   
2. Update .env files with endpoint URL
   REACT_APP_MODERATION_ENDPOINT=https://...
   
3. Restart apps
   npm start (mobile)
   cd admin-web && npm start (admin)
   
4. Run automated tests
   .\test-ai-moderation.ps1
   
5. Manual mobile testing
   • Create reports with blocked keywords
   • Upload test images
   • Verify rejections appear
   
6. Check admin panel
   • View moderation logs
   • Verify all entries logged
   • Check confidence scores
   
7. Check Firestore
   • View moderationLogs collection
   • Verify status and timestamps
```

---

## 📞 Detailed Documentation

- **Full Guide**: `TESTING_AI_MODERATION.md`
- **Deployment**: `DEPLOY_MODERATION.md`
- **Troubleshooting**: `TROUBLESHOOTING_SETUP.md`
- **API Setup**: `API_KEYS_SETUP.md`

---

## ✅ Success Indicators

You'll know it's working when:

- ✅ Keyword blocks appear instantly (<1s)
- ✅ Text analysis shows violation types and risk levels
- ✅ Image uploads are analyzed with confidence scores
- ✅ All decisions logged to Firestore `moderationLogs`
- ✅ Admin panel shows all entries
- ✅ Mobile app shows rejection/approval popups
- ✅ Posts don't appear in feed if blocked

