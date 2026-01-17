# AI Chatbot Setup Guide

Your chatbot now supports **real AI models** for natural language understanding! 🤖

## Current Status
- ✅ **Rule-based system** (keyword matching) - Active by default
- ⚡ **AI model integration** - Ready to enable

---

## Option 1: Google Gemini (FREE - Recommended)

### Advantages:
- ✅ **Completely FREE** (60 requests per minute)
- ✅ No credit card required
- ✅ Great natural language understanding
- ✅ Easy setup (5 minutes)

### Setup Steps:

1. **Get your FREE API key:**
   - Go to: https://makersuite.google.com/app/apikey
   - Sign in with your Google account
   - Click "Create API Key"
   - Copy the key

2. **Add to your project:**
   - Open `services/chatbotService.js`
   - Find line 5: `const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY';`
   - Replace with: `const GEMINI_API_KEY = 'your-actual-key-here';`

3. **Test it:**
   - Restart your app
   - Go to Chat screen
   - Ask: "What can I report?"
   - You should see natural AI responses!

### Example Key Format:
```javascript
const GEMINI_API_KEY = 'AIzaSyC-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
```

---

## Option 2: OpenAI ChatGPT (PAID - Most Advanced)

### Advantages:
- ✅ Most advanced understanding
- ✅ Better conversational flow
- ✅ Industry standard

### Disadvantages:
- ❌ Requires payment ($0.002 per request)
- ❌ Credit card required

### Setup Steps:

1. **Get API key:**
   - Go to: https://platform.openai.com/api-keys
   - Create account + add payment method
   - Create API key

2. **Switch to OpenAI:**
   - Open `services/chatbotService.js`
   - Line 8: Add your key to `OPENAI_API_KEY`
   - Line 167: Change `processWithGeminiAI` to `processWithOpenAI`

---

## How It Works

### With AI Model (Gemini/OpenAI):
```
User: "hey i have a problem with the wifi in library"
Bot: "I can help you report that IT issue! Go to Submit Report, 
     select 'IT' category, and describe the wifi problem. 
     I'll make sure it gets to the right team. 📡"
```

### Without AI (Rule-based fallback):
```
User: "hey i have a problem with the wifi in library"
Bot: "I can help you with reporting issues, checking status, 
     or general campus questions. What would you like to know?"
```

---

## Automatic Fallback

Don't worry! If AI fails or isn't configured:
- ✅ Automatically uses rule-based system
- ✅ No errors or crashes
- ✅ Still provides helpful responses

---

## Testing Your Setup

### Test Questions:
1. **"How do I report a broken chair?"** - Should give natural explanation
2. **"My laptop charger got stolen from classroom"** - Should suggest category
3. **"What's the fastest way to get help?"** - Should mention priorities

### What to Look For:
- ✅ Responses sound natural (not robotic)
- ✅ Bot understands context
- ✅ Suggestions are relevant
- ✅ Can handle misspellings and slang

---

## Performance & Costs

### Gemini (Free):
- 📊 **60 requests/minute** = ~3,600 requests/hour
- 💰 **Cost:** $0 (FREE forever)
- ⚡ **Speed:** ~1-2 seconds per response

### OpenAI GPT-3.5:
- 📊 **10,000 requests/minute** (paid limit)
- 💰 **Cost:** ~$0.002 per request (~$2 per 1,000 chats)
- ⚡ **Speed:** ~0.5-1 second per response

### For Your Campus App:
- Average: 50-100 chat requests per day
- Gemini: **$0/month** ✅
- OpenAI: **~$0.30/month**

---

## Customization

### Adjust AI Personality:

Edit the `systemContext` in `chatbotService.js`:

```javascript
static systemContext = `You are a helpful campus assistant chatbot for Cor Jesu College. 

[Current personality]
Your role is to help students and staff with...

[Customize to:]
- Add more friendly tone: "You're a supportive friend who..."
- Make it formal: "You are a professional assistant..."
- Add humor: "You're a witty helper who makes students smile..."
- Be concise: "Give short, emoji-filled responses..."
`;
```

### Adjust Response Length:

```javascript
// Gemini
maxOutputTokens: 200,  // Change to 100 for shorter, 500 for longer

// OpenAI
max_tokens: 200,  // Same idea
```

---

## Troubleshooting

### "AI failed, falling back to rule-based"
- ✅ This is normal if API key is missing
- Check if key is correctly pasted
- Verify internet connection
- Check API quota (Gemini: 60/min)

### Responses are too slow
- Reduce `maxOutputTokens` to 100
- Use Gemini (it's optimized for speed)
- Add loading indicator in ChatScreen

### Responses are not relevant
- Adjust `systemContext` to be more specific
- Lower `temperature` to 0.5 for more focused responses
- Add more context about your campus

---

## Recommended: Start with Gemini FREE

1. 5 minute setup
2. No payment needed
3. Great quality
4. Upgrade to OpenAI later if needed

**Get your key now:** https://makersuite.google.com/app/apikey

---

## Security Notes

⚠️ **Important:**
- Never commit API keys to GitHub
- Add `.env` file for production
- Rotate keys regularly
- Monitor usage in API dashboard

### Production Setup:
```javascript
// Use environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'fallback-key';
```

---

## Need Help?

- Gemini Docs: https://ai.google.dev/docs
- OpenAI Docs: https://platform.openai.com/docs
- Test your key: Use Postman to verify API calls work
