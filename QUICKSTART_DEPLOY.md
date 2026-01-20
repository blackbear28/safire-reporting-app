# 🚀 Quick Start: Deploy AI Moderation

## Before You Start
Have these ready:
- ✅ Gemini API Key (get from https://makersuite.google.com/app/apikey)
- ✅ HuggingFace Token (get from https://huggingface.co/settings/tokens)
- ✅ Firebase CLI installed (`npm install -g firebase-tools`)
- ✅ Firebase login (`firebase login`)

## Deploy in 5 Steps

### Step 1: Verify Setup (2 min)
```bash
# Windows
deploy-checklist.bat

# macOS/Linux
bash deploy-checklist.sh
```

### Step 2: Configure API Keys (1 min)
Replace `YOUR_GEMINI_KEY` and `YOUR_HF_TOKEN` with your actual keys:

```bash
firebase functions:config:set moderation.gemini_key="YOUR_GEMINI_KEY" moderation.hf_token="YOUR_HF_TOKEN"
```

**Verify it worked:**
```bash
firebase functions:config:get
```

Output should show both keys set.

### Step 3: Deploy Cloud Function (3-5 min)
```bash
cd functions
npm install
firebase deploy --only functions
```

**You'll see output like:**
```
✔ functions[moderationAnalyze] deployed successfully
✔ Function URL (us-central1-YOUR_PROJECT.cloudfunctions.net/moderationAnalyze)
```

**Copy the function URL** — you'll need it next.

### Step 4: Update Client Endpoints (1 min)

**Root `.env` file** (for mobile app):
```env
REACT_APP_MODERATION_ENDPOINT=https://us-central1-YOUR_PROJECT.cloudfunctions.net/moderationAnalyze
```

**`admin-web/.env` file** (for admin panel):
```env
REACT_APP_MODERATION_ENDPOINT=https://us-central1-YOUR_PROJECT.cloudfunctions.net/moderationAnalyze
```

### Step 5: Restart Apps (1 min)

**Terminal 1 - Mobile/Web:**
```bash
npm start
```

**Terminal 2 - Admin Panel:**
```bash
cd admin-web
npm start
```

## ✅ Done!

Your AI moderation is now live!

### Test It

1. **Open admin panel:** http://localhost:3000
2. **Go to Moderation Logs** (left sidebar) → should be empty initially
3. **Create a test report** with text containing a prohibited keyword (e.g., "sex", "violence")
4. **Check Moderation Logs** → should see the blocked report

### Monitor

**View real-time logs:**
```bash
firebase functions:log --region=us-central1 --lines=50
```

**View moderation decisions:**
1. Firebase Console → Firestore → Collections → `moderationLogs`
2. Each document shows what was blocked/approved and why

## Troubleshooting

**"API key not configured" error:**
```bash
firebase functions:config:get
# Check both keys are listed
firebase functions:config:set moderation.gemini_key="NEW_KEY" moderation.hf_token="NEW_TOKEN"
firebase deploy --only functions
```

**Function returns 404:**
```bash
firebase functions:list
# Copy exact URL from output and update .env files
```

**Slow responses:**
- Check Gemini/HuggingFace API status at their dashboards
- First request may take 10+ seconds due to cold start

## What's Protected?

Your moderation system blocks posts/reports for:
- ✓ Violence, threats, self-harm
- ✓ Sexual, NSFW, inappropriate images
- ✓ Harassment, bullying, hate speech
- ✓ Spam, gibberish, suspicious patterns
- ✓ Explicit keywords and profanity

## Next: Advanced Setup

For production, see `DEPLOY_MODERATION.md`:
- Rate limiting
- Cloud Logging & alerts
- CI/CD automation
- Scaling recommendations

---

**Questions?** Check `API_KEYS_SETUP.md` or `DEPLOY_MODERATION.md` for detailed guides.
