const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// Environment / functions config keys
const getKeys = () => {
  const cfg = functions.config && functions.config().moderation ? functions.config().moderation : {};
  return {
    geminiKey: cfg.gemini_key || process.env.GEMINI_API_KEY || '',
    hfToken: cfg.hf_token || process.env.HUGGINGFACE_TOKEN || ''
  };
};

// Basic keyword list for instant blocking
const KEYWORDS = ['sex', 'nude', 'porn', 'kill', 'bomb', 'terror', 'rape', 'fuck', 'slur'];

function quickPreCheck(text = '') {
  const t = (text || '').trim();
  if (!t || t.length < 8) return { passed: false, reason: 'Too short', violation: 'too_short' };
  const upperRatio = (t.replace(/[^A-Z]/g, '').length) / Math.max(1, t.length);
  if (upperRatio > 0.6) return { passed: false, reason: 'Excessive capital letters', violation: 'all_caps' };
  for (const kw of KEYWORDS) {
    if (t.toLowerCase().includes(kw)) return { passed: false, reason: 'Contains prohibited keyword', violation: 'explicit_keyword' };
  }
  return { passed: true };
}

async function callGemini(geminiKey, prompt) {
  if (!geminiKey) throw new Error('Gemini API key not configured');
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-mini:generateContent?key=${geminiKey}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.0, maxOutputTokens: 512 }
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000); // 8 second timeout

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini API error ${resp.status}`);
    }
    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

async function callHfImageModeration(hfToken, imageUrl) {
  if (!hfToken) throw new Error('HuggingFace token not configured');
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const resp = await fetch(`https://api-inference.huggingface.co/models/Falconsai/nsfw_image_detection`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hfToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: imageUrl }),
      signal: controller.signal
    });
    
    if (!resp.ok) {
      const err = await resp.text().catch(() => '');
      throw new Error(`HF image moderation failed: ${resp.status} ${err}`);
    }
    const data = await resp.json();
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

exports.moderationAnalyze = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    const { geminiKey, hfToken } = getKeys();

    const payload = req.body || {};
    const { title, description, media = [], postId, userId, type } = payload;

    // Validate input
    if (!title && !description) {
      return res.status(400).json({ error: 'Title or description required' });
    }

    // quick pre-check
    const pre = quickPreCheck(`${title || ''} \n ${description || ''}`);
    if (!pre.passed) {
      const log = {
        userId: userId || null,
        postId: postId || null,
        action: 'blocked',
        violationType: pre.violation,
        message: pre.reason,
        method: 'precheck',
        contentPreview: (description || '').slice(0, 300),
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      };
      try {
        await db.collection('moderationLogs').add(log);
      } catch (logErr) {
        console.warn('Failed to log precheck block:', logErr.message);
      }
      return res.json({ allowed: false, reason: pre.reason, violationType: pre.violation, confidence: 0.95 });
    }

    // Build prompt for Gemini with clearer instructions
    const prompt = `You are a school content moderation assistant. Analyze the following student post for policy violations.
Return ONLY a valid JSON object (no markdown, no extra text) with keys:
- allowed: boolean (true if safe, false if violates policy)
- violationType: string or null (e.g., "violence", "sexual", "harassment", "hate_speech", "self_harm", "spam", "inappropriate", null if allowed)
- confidence: number (0-100, higher = more certain)
- reasons: array of strings (brief violation reasons)

Content to analyze:
Title: ${title || 'N/A'}
Description: ${description || 'N/A'}
Has Images: ${media.length > 0 ? 'yes' : 'no'}

Policy violations include: violence/threats, sexual content, harassment, hate speech, self-harm, spam, explicit material, illegal content, privacy violations.`;

    let aiText = null;
    try {
      const respText = await callGemini(geminiKey, prompt);
      // Extract JSON more robustly
      const jsonMatch = respText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiText = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (aiErr) {
      console.warn('Gemini error:', aiErr.message || aiErr);
      // Fallback: keyword-only or safe default
      aiText = { 
        allowed: true, 
        violationType: null, 
        confidence: 30, 
        reasons: ['AI unavailable - fallback mode']
      };
    }

    // Image checks (if any media and HF token available)
    const imageFlags = [];
    if (media && media.length > 0 && hfToken) {
      for (const url of media) {
        try {
          const imgResult = await callHfImageModeration(hfToken, url);
          // Check if image is flagged as NSFW
          if (Array.isArray(imgResult) && imgResult.length > 0) {
            const nsfw = imgResult.find(item => item.label === 'nsfw');
            if (nsfw && nsfw.score > 0.7) {
              imageFlags.push({ url, nsfw: true, confidence: nsfw.score });
            }
          }
        } catch (imgErr) {
          console.warn('Image moderation error:', imgErr.message);
          // Continue without failing the entire request
        }
      }
    }

    // Build final response
    let allowed = !!aiText.allowed;
    let violationType = aiText.violationType;
    
    // If images flagged, block regardless of text
    if (imageFlags.some(f => f.nsfw)) {
      allowed = false;
      violationType = violationType || 'inappropriate_image';
    }

    const final = {
      allowed,
      violationType,
      confidence: aiText.confidence || 50,
      message: aiText.message || (allowed ? 'Post approved' : 'Post blocked for policy violation'),
      details: { ai: aiText, images: imageFlags }
    };

    // Log to Firestore
    const logDoc = {
      userId: userId || null,
      postId: postId || null,
      action: final.allowed ? 'approved' : 'rejected',
      violationType: final.violationType,
      confidence: final.confidence,
      message: final.message,
      method: 'ai_moderation',
      contentPreview: (description || '').slice(0, 500),
      analyzedAt: admin.firestore.FieldValue.serverTimestamp(),
      raw: final.details
    };

    try {
      await db.collection('moderationLogs').add(logDoc);
    } catch (logErr) {
      console.warn('Failed to log moderation result:', logErr.message);
    }

    // Update post/report doc if postId provided
    if (postId) {
      const collectionName = type === 'report' ? 'reports' : 'posts';
      try {
        await db.collection(collectionName).doc(postId).set({
          aiModerated: true,
          aiResult: {
            allowed: final.allowed,
            violationType: final.violationType,
            message: final.message,
            confidence: final.confidence,
            analyzedAt: admin.firestore.Timestamp.now()
          }
        }, { merge: true });
      } catch (err) {
        console.warn('Failed to update post/report with aiResult:', err.message);
      }
    }

    return res.json(final);

  } catch (error) {
    console.error('Moderation function error:', error);
    return res.status(500).json({ error: error.message || 'Internal error' });
  }
});
