# 🛡️ AI Moderation - Quick Reference

## 🚀 Setup in 3 Steps

1. **Get free API key**: https://makersuite.google.com/app/apikey
2. **Update key**: `services/moderationService.js` line 7
3. **Test**: Submit a report and check console logs

## 🎯 What Gets Blocked?

### Text ❌
- Violence/threats ("kill", "bomb")
- Sexual content ("porn", "xxx")
- Spam (repeated characters)
- Gibberish (random letters)
- Non-school topics (when context = 'post')

### Images ❌
- Weapons or violence
- Sexual/NSFW content
- Graphic injuries
- Hate symbols
- Self-harm imagery

## 📊 API Limits (Free Tier)

| Service | Daily Limit | Per Report |
|---------|-------------|------------|
| Google Gemini | 1,500 requests | 3-4 requests |
| **Your Capacity** | **~400 reports/day** | **3-5 seconds** |

## 🧪 Quick Test

```javascript
// In mobile app, try submitting:

// ✅ SHOULD PASS:
"The library AC is broken and needs repair"

// ❌ SHOULD FAIL:
"asdfghjkl qwerty nonsense spam"
"Click here to buy xxx content"
```

## 🔧 Quick Config

```javascript
// moderationService.js

// Line 7: Add API key
const GEMINI_API_KEY = 'AIzaSy...';

// Line 332: Adjust strictness (0.5 = balanced)
const allowed = nsfwScore < 0.5; // Lower = stricter

// Line 64-75: Add custom keywords
const explicitKeywords = [
  'kill', 'murder', 'bomb',
  'custom_word_here', // Add yours
];
```

## 🚨 Error Handling

**If AI fails:** Content is ALLOWED + flagged for manual review ✅

**Why?** Better to have false negatives than false positives blocking legitimate reports.

## 📈 Monitor in Admin Panel

1. Navigate to **Moderation** in sidebar
2. View status: Active/Limited/Disabled
3. Check protection level: 30%/70%/100%
4. Test with sample content

## 💡 Pro Tips

1. **Start with keywords only** - Then enable AI after testing
2. **Monitor for false positives** - First week is crucial
3. **Allow appeals** - Users should be able to contest blocks
4. **Train staff** - On manual review of flagged content

## 📞 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Service unavailable" | Check API key, internet, quota |
| Too many blocks | Lower threshold (line 332) |
| Slow (>10s) | Use smaller images |
| False negatives | Add custom keywords |

## 🎓 School-Specific Settings

```javascript
// Skip relevance check for official reports
if (context === 'report' || context === 'complaint') {
  return { allowed: true };
}
```

This allows all official reports through without checking if they're "school-related".

## ✅ Pre-Launch Checklist

- [ ] API key configured
- [ ] Test reports submitted (pass & fail)
- [ ] Admin can view flagged content
- [ ] Staff trained on manual review
- [ ] Privacy policy mentions AI moderation

---

**Full docs:** See `AI_MODERATION_SETUP.md`
