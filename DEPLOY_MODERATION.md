# 🚀 Deploy Moderation Cloud Function

## Prerequisites

1. **Firebase CLI installed:**
   ```bash
   npm install -g firebase-tools
   ```

2. **Logged in to Firebase:**
   ```bash
   firebase login
   ```

3. **Your Gemini and HuggingFace API keys ready**

## Step 1: Configure Server-Side Secrets

Store API keys securely in Firebase Functions config (not in `.env`):

```bash
# Set your API keys (run from project root)
firebase functions:config:set moderation.gemini_key="YOUR_GEMINI_API_KEY" moderation.hf_token="YOUR_HUGGINGFACE_TOKEN"
```

**Verify config was set:**
```bash
firebase functions:config:get
```

Output should show:
```
{
  "moderation": {
    "gemini_key": "AIza...",
    "hf_token": "hf_..."
  }
}
```

## Step 2: Deploy the Cloud Function

From the `functions` folder:

```bash
cd functions
npm install
firebase deploy --only functions
```

**Output will show:**
```
✔ Function URL: https://us-central1-YOUR_PROJECT.cloudfunctions.net/moderationAnalyze
```

**Save this URL** — you'll use it in the client code.

## Step 3: Update Client Endpoint URL

In mobile/web app, update the moderation endpoint:

**Root `.env` file (mobile app):**
```env
REACT_APP_MODERATION_ENDPOINT=https://us-central1-YOUR_PROJECT.cloudfunctions.net/moderationAnalyze
```

**Admin `admin-web/.env` file:**
```env
REACT_APP_MODERATION_ENDPOINT=https://us-central1-YOUR_PROJECT.cloudfunctions.net/moderationAnalyze
```

Then restart the apps.

## Step 4: Enable Cloud Logging

Moderation events are logged to Firestore `moderationLogs` collection automatically.

**View logs in Firebase Console:**
1. Go to Firestore Database → Collections
2. Find `moderationLogs` collection
3. View documents with timestamps and violation details

**View Cloud Function logs:**
```bash
firebase functions:log --region=us-central1 --lines=50
```

## Performance & Rate Limiting

### Recommended Settings

- **Timeout:** 30 seconds per request (default for Cloud Functions)
- **Memory:** 512 MB or 1 GB (depending on traffic)
- **Concurrent Executions:** Automatically scaled by Google Cloud

### Manual Rate Limiting (Optional)

If you need to limit requests per user/IP:

**In `functions/moderationAnalyze.js`, add at the top:**

```javascript
const rateLimit = {};

function isRateLimited(userId, maxPerMinute = 5) {
  const now = Date.now();
  const key = userId || 'anonymous';
  
  if (!rateLimit[key]) {
    rateLimit[key] = [];
  }
  
  // Remove old entries (older than 1 minute)
  rateLimit[key] = rateLimit[key].filter(t => now - t < 60000);
  
  if (rateLimit[key].length >= maxPerMinute) {
    return true; // Rate limited
  }
  
  rateLimit[key].push(now);
  return false;
}
```

**Then in the handler, before processing:**

```javascript
if (isRateLimited(userId)) {
  return res.status(429).json({ error: 'Too many requests. Try again later.' });
}
```

## Monitoring & Alerts

### Check Function Status

```bash
# View recent deployments
firebase functions:list

# View specific function details
firebase functions:describe moderationAnalyze --region=us-central1
```

### Set Up Alerts (GCP Console)

1. Go to Google Cloud Console → Cloud Functions
2. Click `moderationAnalyze`
3. Go to Monitoring tab
4. Create alert for:
   - **Error rate** > 5% (trigger alert)
   - **Execution time** > 25 seconds (trigger alert)
   - **Memory usage** > 90% (trigger alert)

### Monitor Firestore Writes

Check `moderationLogs` document growth:

```bash
firebase firestore:delete moderationLogs --query "analyzedAt < $(date -d '30 days ago' +%s)000" --recursive
```

This deletes logs older than 30 days to manage Firestore costs.

## Troubleshooting

### Function Returns 404

**Problem:** `https://us-central1-... not found`

**Solution:** 
1. Confirm deploy succeeded: `firebase functions:list`
2. Check function URL format matches Firebase Console
3. Redeploy: `firebase deploy --only functions`

### "API key not configured" Error

**Problem:** Function logs show key not found

**Solution:**
1. Verify config: `firebase functions:config:get`
2. Re-set keys: `firebase functions:config:set moderation.gemini_key="KEY" moderation.hf_token="TOKEN"`
3. Redeploy: `firebase deploy --only functions`

### Slow Responses (> 20 seconds)

**Problem:** Gemini/HF APIs are slow or timeout

**Solution:**
1. Check internet connection
2. Verify API rate limits not exceeded on Gemini/HF dashboards
3. Increase function timeout (in `functions/moderationAnalyze.js`): change `8000` to `15000` for Gemini timeout
4. Consider caching results for repeated content

### High Firestore Costs

**Problem:** `moderationLogs` writing too frequently

**Solution:**
1. Batch writes (every 5-10 requests instead of each one)
2. Delete old logs: `firebase firestore:delete moderationLogs --older-than=30d`
3. Increase confidence threshold to log only medium+ confidence results

## Local Testing with Emulator

Test the function locally before deploying:

```bash
# Start Firebase emulator
firebase emulators:start --only functions

# In another terminal, test the function
curl -X POST http://localhost:5001/YOUR_PROJECT/us-central1/moderationAnalyze \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test post",
    "description": "This is a test",
    "userId": "test-user-1"
  }'
```

## Rollback to Previous Version

If deployment causes issues:

```bash
# View deployment history
firebase functions:list --regions us-central1

# Delete current version (goes back to previous)
firebase functions:delete moderationAnalyze --region us-central1
```

Then re-deploy the previous version or fix and redeploy.

## CI/CD Integration

For automated deployments (e.g., GitHub Actions):

**.github/workflows/deploy.yml:**

```yaml
name: Deploy Functions
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci --prefix functions
      - uses: w9jds/firebase-action@master
        with:
          args: deploy --only functions
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

Get `FIREBASE_TOKEN`:
```bash
firebase login:ci
```

Copy the token to GitHub Secrets as `FIREBASE_TOKEN`.

## Next Steps

1. ✅ Configure keys: `firebase functions:config:set ...`
2. ✅ Deploy: `firebase deploy --only functions`
3. ✅ Update client endpoint URLs (`.env` files)
4. ✅ Test with `test-moderation-http.js`: `node test-moderation-http.js https://us-central1-YOUR_PROJECT.cloudfunctions.net/moderationAnalyze`
5. ✅ Monitor logs: `firebase functions:log`
6. ✅ Set up GCP alerts for errors and slow responses

---

**Questions?** See `API_KEYS_SETUP.md` for detailed key setup, or `AI_POST_MODERATION_GUIDE.md` for moderation logic details.
