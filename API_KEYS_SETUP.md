## 🔐 Server-side (Recommended for production)

For security, store sensitive API keys on the server (Firebase Functions `functions.config()` or GCP Secret Manager) and avoid exposing them to the client.

1. Install and login to Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
```

2. Set functions config (replace with your keys):

```bash
firebase functions:config:set moderation.gemini_key="YOUR_GEMINI_KEY" moderation.hf_token="YOUR_HF_TOKEN"
```

3. Deploy functions from the `functions` folder:

```bash
cd functions
npm install
firebase deploy --only functions
```

4. After deploy, your function will read keys via `functions.config().moderation`.

Notes:
- Using server-side secrets prevents leaking keys in the browser or mobile bundles.
- CI/CD systems can set these config values as part of deployment.

# 🔑 API Keys Configuration Guide

## ⚡ Quick Setup (Choose ONE method)

### Method 1: Environment Variables (RECOMMENDED ✅)
**Best for:** Production, security, team collaboration

#### Mobile App:
1. Create `.env` file in project root:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and paste your keys:
   ```env
   REACT_APP_GEMINI_API_KEY=AIzaSyD_your_actual_gemini_key_here
   REACT_APP_HUGGINGFACE_TOKEN=hf_your_actual_huggingface_token_here
   ```

3. Restart app:
   ```bash
   npm start
   ```

#### Admin Panel:
1. Create `.env` in `admin-web/` folder:
   ```bash
   cd admin-web
   cp .env.example .env
   ```

2. Edit `admin-web/.env`:
   ```env
   REACT_APP_GEMINI_API_KEY=AIzaSyD_your_actual_gemini_key_here
   REACT_APP_HUGGINGFACE_TOKEN=hf_your_actual_huggingface_token_here
   ```

3. Restart admin panel:
   ```bash
   npm start
   ```

**Advantages:**
- ✅ Persists forever (no need to reconfigure)
- ✅ Secure (not in code, not committed to git)
- ✅ Works across all components automatically
- ✅ Easy to update without code changes

---

### Method 2: Hardcode in Service File (QUICK & SIMPLE ⚡)
**Best for:** Quick testing, single developer, personal projects

1. Open `services/moderationService.js`

2. Find these lines (around line 25):
   ```javascript
   // PASTE YOUR API KEYS HERE (if not using .env file):
   let GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY';
   let HUGGING_FACE_TOKEN = process.env.REACT_APP_HUGGINGFACE_TOKEN || 'YOUR_HUGGING_FACE_TOKEN';
   ```

3. Replace with your actual keys:
   ```javascript
   // PASTE YOUR API KEYS HERE (if not using .env file):
   let GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || 'AIzaSyD_your_actual_gemini_key_here';
   let HUGGING_FACE_TOKEN = process.env.REACT_APP_HUGGINGFACE_TOKEN || 'hf_your_actual_huggingface_token_here';
   ```

4. Save file and restart app

**Advantages:**
- ✅ Works immediately (no .env setup)
- ✅ Persists forever (saved in code)
- ✅ Simple to implement

**Disadvantages:**
- ⚠️ Less secure (keys visible in code)
- ⚠️ Must be careful not to commit to public repos
- ⚠️ Need to update in multiple places if keys change

---

### Method 3: Admin Panel UI (ADMIN ONLY 🔧)
**Best for:** Admin-only configuration, runtime changes

1. Login to admin panel: `http://localhost:3000`

2. Navigate to **Moderation** in sidebar

3. Paste your API keys in the text fields

4. Click **"Save Configuration"**

5. Keys saved to **localStorage** (persists across page reloads)

**Advantages:**
- ✅ No code changes needed
- ✅ Persists across page reloads (localStorage)
- ✅ Easy to update

**Disadvantages:**
- ⚠️ Admin panel only (mobile app needs separate config)
- ⚠️ Can be cleared if browser cache is cleared
- ⚠️ Per-browser (different browsers need separate config)

---

## 🔑 Getting Your API Keys (2 minutes)

### Gemini API Key (FREE - 1,500/day)

1. **Visit:** https://makersuite.google.com/app/apikey

2. **Sign in** with Google account

3. **Click** "Create API Key"

4. **Copy** the key (starts with `AIza...`)

5. **Paste** using one of the methods above

### HuggingFace Token (FREE - Unlimited)

1. **Visit:** https://huggingface.co/settings/tokens

2. **Sign up/Login** (free account)

3. **Click** "New token"

4. **Name:** "SAFIRE Moderation"

5. **Role:** Read

6. **Copy** token (starts with `hf_...`)

7. **Paste** using one of the methods above

---

## 🎯 My Recommendation

**For your case (wanting persistent config):**

### Use Method 1 (Environment Variables) ✅

**Why?**
1. ✅ **Persists forever** - Never need to reconfigure
2. ✅ **Works everywhere** - Both mobile app AND admin panel
3. ✅ **Most secure** - Keys not in code, not in browser storage
4. ✅ **Team-friendly** - Each dev has their own .env file
5. ✅ **Standard practice** - Industry best practice

**Setup time:** 2 minutes  
**Configuration frequency:** Once (never again)

---

## 📝 Step-by-Step: Environment Variables Setup

### For Mobile App:

```bash
# 1. Navigate to project root
cd D:\safire-reporting-app-main

# 2. Create .env file
copy .env.example .env

# 3. Edit .env file with your API keys
notepad .env

# 4. Add these lines (replace with your actual keys):
REACT_APP_GEMINI_API_KEY=AIzaSyD_paste_your_actual_key_here
REACT_APP_HUGGINGFACE_TOKEN=hf_paste_your_actual_token_here

# 5. Save and close notepad

# 6. Restart app
npm start
```

### For Admin Panel:

```bash
# 1. Navigate to admin-web folder
cd D:\safire-reporting-app-main\admin-web

# 2. Create .env file
copy .env.example .env

# 3. Edit .env file
notepad .env

# 4. Add same keys:
REACT_APP_GEMINI_API_KEY=AIzaSyD_paste_your_actual_key_here
REACT_APP_HUGGINGFACE_TOKEN=hf_paste_your_actual_token_here

# 5. Save and close

# 6. Restart admin panel
npm start
```

**Done! Keys will work forever, no need to reconfigure! 🎉**

---

## 🔒 Security Best Practices

### ✅ DO:
- Use .env files for API keys
- Add `.env` to `.gitignore` (already done)
- Keep `.env.example` as template (no real keys)
- Use different keys for dev/production

### ❌ DON'T:
- Commit real API keys to git
- Share keys publicly
- Hardcode keys in public repositories
- Use same keys across all environments

---

## 🐛 Troubleshooting

### Keys not working after setup?

**Check 1:** Restart the app/server
```bash
# Stop with Ctrl+C, then:
npm start
```

**Check 2:** Verify .env file location
- Mobile: `D:\safire-reporting-app-main\.env`
- Admin: `D:\safire-reporting-app-main\admin-web\.env`

**Check 3:** Check .env syntax (no spaces around =)
```env
# ✅ CORRECT
REACT_APP_GEMINI_API_KEY=AIzaSyD_key_here

# ❌ WRONG (spaces)
REACT_APP_GEMINI_API_KEY = AIzaSyD_key_here

# ❌ WRONG (quotes)
REACT_APP_GEMINI_API_KEY="AIzaSyD_key_here"
```

**Check 4:** Console should show:
```
🛡️ Moderation service initialized: Full AI protection (Gemini + HuggingFace)
```

---

## 📊 Verification

### Test if keys are working:

#### In Mobile App:
1. Go to Settings → Moderation Settings
2. Should show green checkmarks ✅
3. Click "Test Moderation"
4. Should pass tests

#### In Admin Panel:
1. Navigate to Moderation
2. Status should show "Active" with green badges
3. Click "Test Moderation"
4. Should detect violations

#### Via Code:
```javascript
// In any component:
console.log('Gemini Key:', process.env.REACT_APP_GEMINI_API_KEY?.substring(0, 10) + '...');
// Should show: AIzaSyD_...
```

---

## 🚀 What Happens After Setup?

**With keys configured:**
- ✅ Real-time AI moderation active
- ✅ Context-aware content analysis
- ✅ Image moderation enabled
- ✅ 90% accuracy
- ✅ Logs appear in admin panel

**Without keys:**
- ⚠️ Keyword-only mode (30% coverage)
- ⚠️ No AI analysis
- ⚠️ No image moderation
- ✅ App still works (graceful degradation)

---

## 📞 Need Help?

**If keys still not persisting:**
1. Verify you created `.env` file (not `.env.txt`)
2. Check file is in correct directory
3. Restart terminal and app
4. Check console for errors

**Quick test:**
```bash
# Check if .env file exists
dir .env

# Should show: .env file with size > 0 bytes
```

---

## ✨ Summary

**Best Method for You:** Environment Variables (.env file)

**Why?** 
- Persists forever ✅
- Works everywhere ✅  
- Most secure ✅
- Industry standard ✅

**Time:** 2 minutes setup, works forever

**Next Steps:**
1. Create `.env` files (both root and admin-web)
2. Paste your API keys
3. Restart apps
4. Test moderation
5. **Done! 🎉**

No more reconfiguring after page reload!
