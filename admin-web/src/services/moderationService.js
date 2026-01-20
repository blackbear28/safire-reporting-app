// admin-web/src/services/moderationService.js
// Web-compatible version of moderation service for admin panel

class ModerationService {

  static getApiKeys() {
    // Priority: environment variables (admin web uses .env) > localStorage
    const perspectiveKey = process.env.REACT_APP_PERSPECTIVE_API_KEY || localStorage.getItem('PERSPECTIVE_API_KEY') || '';
    const hfToken = process.env.REACT_APP_HUGGINGFACE_TOKEN || localStorage.getItem('HUGGING_FACE_TOKEN') || '';
    return { perspectiveKey, hfToken };
  }
  
  // Quick keyword and spam pre-check (instant, no API)
  static keywordPreCheck(text) {
    if (!text || !text.toString) return { allowed: true };
    const lower = text.toString().toLowerCase();
    const explicitKeywords = [
      'fuck','fucking','shit','bitch','asshole','puta','putang','putangina','gago','spam','click here','buy now'
    ];

    for (const kw of explicitKeywords) {
      if (lower.includes(kw)) {
        return { allowed: false, reason: `Contains prohibited keyword: ${kw}`, category: 'keyword' };
      }
    }

    // Simple spam heuristics
    if ((text.length || 0) > 500) {
      return { allowed: false, reason: 'Excessive length - possible spam', category: 'spam' };
    }

    if (/([a-z])\1{10,}/i.test(text)) {
      return { allowed: false, reason: 'Repeated characters - possible bot/spam', category: 'spam' };
    }

    return { allowed: true };
  }

  static isConfigured() {
    const { perspectiveKey, hfToken } = this.getApiKeys();
    return {
      perspective: perspectiveKey && perspectiveKey.length > 20 && !perspectiveKey.includes('YOUR_'),
      huggingface: hfToken && hfToken.length > 20 && !hfToken.includes('YOUR_')
    };
  }

  static getStatus() {
    const cfg = this.isConfigured();
    if (cfg.perspective && cfg.huggingface) return { configured: true, level: 'full', message: 'Perspective + HuggingFace active' };
    if (cfg.perspective) return { configured: true, level: 'text-only', message: 'Perspective active' };
    if (cfg.huggingface) return { configured: true, level: 'image-only', message: 'HuggingFace active' };
    return { configured: false, level: 'basic', message: 'No AI keys configured' };
  }

  // Moderate text using Perspective API
  static async moderateTextWithPerspective(text) {
    const { perspectiveKey } = this.getApiKeys();
    if (!perspectiveKey) throw new Error('Perspective API key not configured');

    const body = {
      comment: { text },
      languages: ['en'],
      requestedAttributes: {
        TOXICITY: {}, SEVERE_TOXICITY: {}, IDENTITY_ATTACK: {}, INSULT: {}, PROFANITY: {}, THREAT: {}, SEXUALLY_EXPLICIT: {}
      }
    };

    const res = await fetch(`https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${perspectiveKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Perspective API error ${res.status}`);
    }
    const data = await res.json();
    const scores = {
      toxicity: data.attributeScores?.TOXICITY?.summaryScore?.value || 0,
      severeToxicity: data.attributeScores?.SEVERE_TOXICITY?.summaryScore?.value || 0,
      identityAttack: data.attributeScores?.IDENTITY_ATTACK?.summaryScore?.value || 0,
      insult: data.attributeScores?.INSULT?.summaryScore?.value || 0,
      profanity: data.attributeScores?.PROFANITY?.summaryScore?.value || 0,
      threat: data.attributeScores?.THREAT?.summaryScore?.value || 0,
      sexuallyExplicit: data.attributeScores?.SEXUALLY_EXPLICIT?.summaryScore?.value || 0
    };
    return { success: true, scores };
  }

  // Moderate image using HuggingFace NSFW model
  static async moderateImageWithHuggingFace(imageUrl) {
    const { hfToken } = this.getApiKeys();
    if (!hfToken) throw new Error('HuggingFace token not configured');

    // Fetch image as blob
    const imgRes = await fetch(imageUrl);
    const blob = await imgRes.blob();

    const res = await fetch('https://api-inference.huggingface.co/models/Falconsai/nsfw_image_detection', {
      method: 'POST', headers: { Authorization: `Bearer ${hfToken}` }, body: blob
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HuggingFace error ${res.status}`);
    }
    const data = await res.json();
    // Expect array of {label, score}
    const nsfw = data.find(d => d.label && d.label.toLowerCase().includes('nsfw')) || null;
    const nsfwScore = nsfw ? nsfw.score : 0;
    return { success: true, nsfwScore };
  }

  // Analyze report content using Perspective (text) and HuggingFace (images)
  static async analyzeReport(reportData) {
    try {
      const cfg = this.isConfigured();
      // Quick pre-check (keywords/spam) — runs before API
      const textToCheck = `${reportData.title || ''}\n${reportData.description || ''}`;
      const precheck = this.keywordPreCheck(textToCheck);
      if (!precheck.allowed) {
        // Return immediate flagged analysis
        return {
          success: true,
          analysis: {
            isLegitimate: false,
            legitimacyConfidence: 0,
            severity: 'high',
            credibilityScore: 10,
            riskLevel: 'high',
            suspiciousFactors: [precheck.reason],
            recommendations: ['Manual review recommended'],
            shouldFlag: true,
            reasoning: precheck.reason,
            analyzedAt: new Date().toISOString(),
            textResult: { success: false, reason: precheck.reason },
            imageResults: []
          }
        };
      }

      // Run text moderation if Perspective available
      let textResult = { success: false, reason: 'not_run' };
      if (cfg.perspective) {
        try {
          const t = await this.moderateTextWithPerspective(textToCheck);
          textResult = { success: true, scores: t.scores };
        } catch (e) {
          textResult = { success: false, error: e.message };
        }
      }

      // Run image moderation if images exist and HF configured
      const imageResults = [];
      if (reportData.images && reportData.images.length > 0 && cfg.huggingface) {
        for (const url of reportData.images) {
          try {
            const r = await this.moderateImageWithHuggingFace(url);
            imageResults.push({ url, ...r });
          } catch (e) {
            imageResults.push({ url, success: false, error: e.message });
          }
        }
      }

      // Decide final flags
      let shouldFlag = false;
      let reasons = [];

      if (textResult.success) {
        const s = textResult.scores;
        const threshold = 0.7;
        if (s.severeToxicity > threshold || s.threat > threshold) {
          shouldFlag = true; reasons.push('Severe toxicity or threat detected');
        } else if (s.identityAttack > threshold || s.insult > threshold || s.profanity > threshold) {
          shouldFlag = true; reasons.push('Insult/Identity attack/profanity detected');
        } else if (s.sexuallyExplicit > threshold) {
          shouldFlag = true; reasons.push('Sexually explicit language');
        }
      }

      for (const img of imageResults) {
        if (img.success && img.nsfwScore >= 0.5) {
          shouldFlag = true; reasons.push('NSFW image detected');
        }
      }

      // Compose analysis object
      const analysis = {
        isLegitimate: !shouldFlag,
        legitimacyConfidence: shouldFlag ? 30 : 85,
        severity: shouldFlag ? 'high' : 'low',
        credibilityScore: shouldFlag ? 40 : 90,
        riskLevel: shouldFlag ? 'high' : 'low',
        suspiciousFactors: reasons,
        recommendations: shouldFlag ? ['Manual review recommended'] : ['No action required'],
        shouldFlag,
        reasoning: reasons.join('; ') || 'No issues detected',
        analyzedAt: new Date().toISOString(),
        textResult,
        imageResults
      };

      return { success: true, analysis };
    } catch (error) {
      console.error('Admin AI Analysis Error:', error);
      return { success: false, error: error.message, fallbackAnalysis: this.fallbackAnalysis(reportData) };
    }
  }

  // Fallback analysis when AI is unavailable
  static fallbackAnalysis(reportData) {
    const suspiciousFactors = [];
    let suspicionScore = 0;

    // Check for very short descriptions
    if (reportData.description && reportData.description.length < 20) {
      suspiciousFactors.push('Very short description');
      suspicionScore += 20;
    }

    // Check for all caps
    if (reportData.description && reportData.description === reportData.description.toUpperCase()) {
      suspiciousFactors.push('All caps text');
      suspicionScore += 15;
    }

    // Check for excessive special characters
    const specialChars = (reportData.description || '').match(/[!@#$%^&*()]/g);
    if (specialChars && specialChars.length > 5) {
      suspiciousFactors.push('Excessive special characters');
      suspicionScore += 15;
    }

    return {
      isLegitimate: suspicionScore < 40,
      legitimacyConfidence: 30, // Low confidence without AI
      severity: 'medium',
      credibilityScore: 100 - suspicionScore,
      riskLevel: suspicionScore > 50 ? 'high' : 'medium',
      suspiciousFactors: suspiciousFactors.length > 0 ? suspiciousFactors : ['No AI analysis available'],
      recommendations: ['Manual review recommended', 'AI analysis not available - using basic checks'],
      shouldFlag: suspicionScore > 60,
      reasoning: 'Basic keyword-based analysis (AI not configured)',
      method: 'fallback'
    };
  }

  // Test the configuration
  static async testConnection() {
    try {
      const testResult = await this.analyzeReport({
        title: 'Test Report',
        description: 'This is a test report to verify the AI moderation system is working correctly.',
        category: 'test',
        priority: 'medium',
        anonymous: false,
        userReportCount: 1
      });

      return {
        success: testResult.success,
        message: testResult.success 
          ? 'AI moderation is working correctly!' 
          : 'AI moderation failed: ' + testResult.error
      };
    } catch (error) {
      return {
        success: false,
        message: 'Test failed: ' + error.message
      };
    }
  }
}

export default ModerationService;
