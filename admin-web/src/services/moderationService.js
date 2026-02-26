// admin-web/src/services/moderationService.js
// Enhanced AI moderation — auto-triage, Perspective API, HuggingFace, heuristics

class ModerationService {

  static getApiKeys() {
    const perspectiveKey = process.env.REACT_APP_PERSPECTIVE_API_KEY || localStorage.getItem("PERSPECTIVE_API_KEY") || "";
    const hfToken = process.env.REACT_APP_HUGGINGFACE_TOKEN || localStorage.getItem("HUGGING_FACE_TOKEN") || "";
    const openaiKey = process.env.REACT_APP_OPENAI_API_KEY || localStorage.getItem("OPENAI_API_KEY") || "";
    return { perspectiveKey, hfToken, openaiKey };
  }

  static isConfigured() {
    const { perspectiveKey, hfToken, openaiKey } = this.getApiKeys();
    return {
      openai:      !!(openaiKey && openaiKey.length > 20 && !openaiKey.includes("YOUR_")),
      perspective: !!(perspectiveKey && perspectiveKey.length > 20 && !perspectiveKey.includes("YOUR_")),
      huggingface: !!(hfToken && hfToken.length > 20 && !hfToken.includes("YOUR_")),
    };
  }

  static getStatus() {
    const cfg = this.isConfigured();
    const parts = [];
    if (cfg.openai) parts.push("GPT-4o");
    if (cfg.perspective) parts.push("Perspective");
    if (cfg.huggingface) parts.push("HuggingFace");
    if (parts.length === 0) return { configured: false, level: "basic", message: "Heuristic-only mode" };
    return { configured: true, level: cfg.openai ? "ai" : "api", message: parts.join(" + ") + " active" };
  }

  // ─── GPT-4o-mini: primary multilingual analyzer ───────────────────────────
  static async analyzeWithOpenAI(reportData, userContext = {}) {
    const { openaiKey } = this.getApiKeys();
    if (!openaiKey || openaiKey.includes("YOUR_")) throw new Error("OpenAI key not configured");

    const systemPrompt = `You are an AI content moderator for a school campus incident reporting system (Cor Jesu College). 
Reports may be written in English, Filipino, Tagalog, or Cebuano. Evaluate each report for:
1. Legitimacy — is this a real, actionable school concern?
2. Content safety — harassment, threats, explicit material, spam, or false reporting?
3. Risk level — how urgently does admin need to act?

Context clues for legitimate reports: bullying, academic issues, facility problems, safety hazards, lost items, misconduct.
Context clues for suspicious reports: extremely vague (e.g. single word), testing/spam, personal drama unrelated to school, obvious fake.

Respond ONLY with valid JSON. No extra text. Schema:
{
  "legitimacyScore": <integer 0-100>,
  "riskLevel": <"low"|"medium"|"high">,
  "isLegitimate": <boolean>,
  "shouldFlag": <boolean>,
  "detectedLanguage": <"English"|"Filipino"|"Cebuano"|"Mixed"|"Unknown">,
  "reportType": <brief classification e.g. "Bullying"|"Facility Issue"|"Spam"|"Test"|"Safety Hazard" etc>,
  "reasoning": <one concise sentence explaining the verdict>,
  "suspiciousFactors": <array of strings, empty if none>,
  "recommendations": <array of 1-2 action strings>,
  "suggestedPriority": <"low"|"medium"|"high"|"critical">
}`;

    const userPrompt = [
      `Title: ${reportData.title || "(none)"}`,
      `Description: ${reportData.description || "(none)"}`,
      `Category: ${reportData.category || "other"}`,
      `Current Priority: ${reportData.priority || "medium"}`,
      `Anonymous: ${reportData.anonymous ? "yes" : "no"}`,
      userContext.userReportCount != null ? `Total reports from this user: ${userContext.userReportCount}` : "",
      userContext.userFalseReportsCount > 0 ? `Prior false reports by user: ${userContext.userFalseReportsCount}` : "",
    ].filter(Boolean).join("\n");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.1,
        max_tokens: 400,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenAI API error ${res.status}`);
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    return {
      success: true,
      legitimacyScore: Math.min(100, Math.max(0, Number(parsed.legitimacyScore) || 50)),
      riskLevel: ["low","medium","high"].includes(parsed.riskLevel) ? parsed.riskLevel : "medium",
      isLegitimate: !!parsed.isLegitimate,
      shouldFlag: !!parsed.shouldFlag,
      detectedLanguage: parsed.detectedLanguage || "Unknown",
      reportType: parsed.reportType || "Unknown",
      reasoning: parsed.reasoning || "AI analysis complete",
      suspiciousFactors: Array.isArray(parsed.suspiciousFactors) ? parsed.suspiciousFactors : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      suggestedPriority: ["low","medium","high","critical"].includes(parsed.suggestedPriority) ? parsed.suggestedPriority : "medium",
      tokensUsed: data.usage?.total_tokens || 0,
    };
  }

  static keywordPreCheck(text) {
    if (!text || typeof text.toString !== "function") return { allowed: true };
    const lower = text.toString().toLowerCase();
    const blocked = ["fuck","fucking","shit","bitch","asshole","puta","putang","putangina","gago","bobo","tanga","nude","nudes","porn","spam","click here","buy now"];
    for (const kw of blocked) {
      if (lower.includes(kw)) return { allowed: false, reason: `Contains prohibited keyword: "${kw}"`, category: "keyword" };
    }
    if ((text.length || 0) > 1500) return { allowed: false, reason: "Excessive length — possible spam", category: "spam" };
    if (/([a-z])\1{8,}/i.test(text)) return { allowed: false, reason: "Repeated characters — possible bot", category: "spam" };
    return { allowed: true };
  }

  static async moderateTextWithPerspective(text) {
    const { perspectiveKey } = this.getApiKeys();
    if (!perspectiveKey || perspectiveKey.includes("YOUR_")) throw new Error("Perspective API key not configured");
    const body = {
      comment: { text }, languages: ["en"],
      requestedAttributes: { TOXICITY:{}, SEVERE_TOXICITY:{}, IDENTITY_ATTACK:{}, INSULT:{}, PROFANITY:{}, THREAT:{}, SEXUALLY_EXPLICIT:{} },
    };
    const res = await fetch(`https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${perspectiveKey}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error?.message || `Perspective API error ${res.status}`); }
    const data = await res.json();
    return {
      success: true,
      scores: {
        toxicity: data.attributeScores?.TOXICITY?.summaryScore?.value || 0,
        severeToxicity: data.attributeScores?.SEVERE_TOXICITY?.summaryScore?.value || 0,
        identityAttack: data.attributeScores?.IDENTITY_ATTACK?.summaryScore?.value || 0,
        insult: data.attributeScores?.INSULT?.summaryScore?.value || 0,
        profanity: data.attributeScores?.PROFANITY?.summaryScore?.value || 0,
        threat: data.attributeScores?.THREAT?.summaryScore?.value || 0,
        sexuallyExplicit: data.attributeScores?.SEXUALLY_EXPLICIT?.summaryScore?.value || 0,
      },
    };
  }

  static async moderateImageWithHuggingFace(imageUrl) {
    const { hfToken } = this.getApiKeys();
    if (!hfToken || hfToken.includes("YOUR_")) throw new Error("HuggingFace token not configured");
    const imgRes = await fetch(imageUrl);
    const blob = await imgRes.blob();
    const res = await fetch("https://api-inference.huggingface.co/models/Falconsai/nsfw_image_detection",
      { method: "POST", headers: { Authorization: `Bearer ${hfToken}` }, body: blob });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `HuggingFace error ${res.status}`); }
    const data = await res.json();
    const nsfw = data.find(d => d.label?.toLowerCase().includes("nsfw")) || null;
    return { success: true, nsfwScore: nsfw ? nsfw.score : 0 };
  }

  static applyHeuristics(reportData) {
    const reasons = []; let suspicious = false; let autoFlag = false;
    const desc = (reportData.description || "").trim();
    const title = (reportData.title || "").trim();
    if (desc.length < 10 && title.length < 5) { suspicious = true; reasons.push("Very short or empty content"); }
    if (desc.length > 10 && desc === desc.toUpperCase()) { suspicious = true; reasons.push("All-caps text (aggressive tone)"); }
    const specialChars = desc.match(/[!@#$%^&*()]{3,}/g);
    if (specialChars && specialChars.length > 3) { suspicious = true; reasons.push("Excessive special characters"); }
    if ((reportData.userReportCount || 0) > 15) { suspicious = true; reasons.push(`High submission frequency (${reportData.userReportCount} reports from this user)`); }
    const falseCount = reportData.falseReportCount || reportData.userFalseReportsCount || 0;
    if (falseCount >= 2) { suspicious = true; autoFlag = true; reasons.push(`User has ${falseCount} prior false reports`); }
    return { suspicious, autoFlag, reasons };
  }

  static async analyzeReport(reportData) {
    try {
      const cfg = this.isConfigured();
      const textToCheck = `${reportData.title || ""}\n${reportData.description || ""}`.trim();

      // ── Step 1: Instant keyword pre-check ────────────────────────────────────
      const precheck = this.keywordPreCheck(textToCheck);
      if (!precheck.allowed) {
        return { success: true, analysis: {
          isLegitimate: false, legitimacyConfidence: 5, severity: "high", credibilityScore: 5, riskLevel: "high",
          suspiciousFactors: [precheck.reason], recommendations: ["Remove content immediately", "Review user account"],
          shouldFlag: true, reasoning: precheck.reason, analyzedAt: new Date().toISOString(), method: "keyword_precheck",
          detectedLanguage: null, reportType: null, textResult: null, imageResults: [],
        }};
      }

      // ── Step 2: GPT-4o-mini — primary multilingual contextual analysis ───────
      let gptResult = null;
      if (cfg.openai) {
        try {
          gptResult = await this.analyzeWithOpenAI(reportData, {
            userReportCount: reportData.userReportCount,
            userFalseReportsCount: reportData.userFalseReportsCount,
          });
        } catch (e) {
          console.warn("OpenAI analysis failed, falling back:", e.message);
        }
      }

      // ── Step 3: Perspective API — secondary toxicity check ───────────────────
      let textResult = { success: false, reason: "not_configured" };
      if (cfg.perspective) {
        try { textResult = await this.moderateTextWithPerspective(textToCheck); }
        catch (e) { textResult = { success: false, error: e.message }; }
      }

      // ── Step 4: HuggingFace — NSFW image detection ───────────────────────────
      const imageResults = [];
      const images = reportData.images || reportData.media || [];
      if (images.length > 0 && cfg.huggingface) {
        for (const url of images.slice(0, 5)) {
          try { imageResults.push({ url, ...(await this.moderateImageWithHuggingFace(url)) }); }
          catch (e) { imageResults.push({ url, success: false, error: e.message }); }
        }
      }

      // ── Step 5: Merge results ─────────────────────────────────────────────────
      let reasons = [];
      let shouldFlag = false;
      let legitimacyConfidence;
      let riskLevel;
      let reasoning;
      let detectedLanguage = null;
      let reportType = null;
      let suggestedPriority = reportData.priority || "medium";
      let method;

      if (gptResult && gptResult.success) {
        // GPT is primary — use its scores directly
        legitimacyConfidence = gptResult.legitimacyScore;
        riskLevel = gptResult.riskLevel;
        shouldFlag = gptResult.shouldFlag;
        reasoning = gptResult.reasoning;
        reasons = [...gptResult.suspiciousFactors];
        detectedLanguage = gptResult.detectedLanguage;
        reportType = gptResult.reportType;
        suggestedPriority = gptResult.suggestedPriority;
        method = "gpt-4o-mini";

        // Perspective can override/augment if it finds severe toxicity GPT missed
        if (textResult.success) {
          const s = textResult.scores;
          const maxTox = Math.max(s.severeToxicity, s.threat, s.sexuallyExplicit, s.identityAttack);
          if (maxTox > 0.7 && !shouldFlag) {
            shouldFlag = true;
            reasons.push("Perspective API: high toxicity signals detected");
            legitimacyConfidence = Math.min(legitimacyConfidence, 30);
            riskLevel = "high";
          }
          method = "gpt-4o-mini + perspective";
        }
      } else {
        // GPT unavailable — use Perspective + heuristics
        let maxToxicity = 0;
        if (textResult.success) {
          const s = textResult.scores;
          maxToxicity = Math.max(s.toxicity, s.severeToxicity, s.threat, s.sexuallyExplicit, s.identityAttack);
          if (s.severeToxicity > 0.65 || s.threat > 0.65) { shouldFlag = true; reasons.push("Threat or severe toxicity detected"); }
          else if (s.identityAttack > 0.65 || s.insult > 0.65 || s.profanity > 0.65) { shouldFlag = true; reasons.push("Harassment, insult, or profanity detected"); }
          else if (s.sexuallyExplicit > 0.65) { shouldFlag = true; reasons.push("Sexually explicit language detected"); }
          else if (s.toxicity > 0.75) { shouldFlag = true; reasons.push("High toxicity score"); }
        }
        const heuristics = this.applyHeuristics(reportData);
        if (heuristics.suspicious) { reasons.push(...heuristics.reasons); if (heuristics.autoFlag) shouldFlag = true; }

        if (textResult.success) {
          legitimacyConfidence = Math.round((1 - maxToxicity) * 100);
          method = "perspective_api";
        } else {
          // Pure heuristic score
          let score = 100;
          const desc = (reportData.description || "").trim();
          const title = (reportData.title || "").trim();
          if (desc.length < 20) score -= 30;
          else if (desc.length < 50) score -= 15;
          else if (desc.length >= 100) score += 5;
          if (title.length < 5) score -= 20;
          else if (title.length >= 15) score += 3;
          if (desc.length > 5 && desc === desc.toUpperCase()) score -= 20;
          if (/(.)\1{4,}/.test(desc)) score -= 15;
          score -= heuristics.reasons.length * 12;
          score -= (reportData.userFalseReportsCount || 0) * 15;
          if (reportData.anonymous && desc.length < 40) score -= 10;
          if (reportData.category === "other" && desc.length < 40) score -= 10;
          legitimacyConfidence = Math.min(97, Math.max(5, score));
          method = "heuristic";
        }
        riskLevel = shouldFlag ? "high" : (legitimacyConfidence < 55 ? "high" : legitimacyConfidence < 72 ? "medium" : "low");
        reasoning = reasons.length > 0 ? reasons.join(". ") : "Content passed all moderation checks";
      }

      // Image NSFW override (always applies regardless of method)
      for (const img of imageResults) {
        if (img.success && img.nsfwScore >= 0.5) {
          shouldFlag = true;
          riskLevel = "high";
          reasons.push(`NSFW image detected (${Math.round(img.nsfwScore * 100)}%)`);
          legitimacyConfidence = Math.min(legitimacyConfidence, 20);
        }
      }

      if (shouldFlag) riskLevel = "high";

      return { success: true, analysis: {
        isLegitimate: !shouldFlag, legitimacyConfidence, severity: shouldFlag ? "high" : "low",
        credibilityScore: shouldFlag ? 25 : legitimacyConfidence, riskLevel, suspiciousFactors: reasons,
        recommendations: gptResult?.recommendations?.length
          ? gptResult.recommendations
          : (shouldFlag
              ? ["Flag for immediate human review", "Consider suspending user if repeat offender"]
              : riskLevel === "medium" ? ["Monitor for follow-up patterns"] : ["No action required"]),
        shouldFlag, reasoning, detectedLanguage, reportType, suggestedPriority,
        analyzedAt: new Date().toISOString(), method,
        textResult, imageResults,
        tokensUsed: gptResult?.tokensUsed || 0,
      }};
    } catch (error) {
      return { success: false, error: error.message, fallbackAnalysis: this.fallbackAnalysis(reportData) };
    }
  }

  static buildTriageFromAnalysis(analysis, reportData) {
    const {
      shouldFlag, riskLevel, legitimacyConfidence, reasoning,
      suspiciousFactors, recommendations, method,
      detectedLanguage, reportType,
      suggestedPriority: gptPriority,
      tokensUsed,
    } = analysis;
    let recommendedAction, verdictLabel, verdictColor, urgency;
    if (shouldFlag || riskLevel === "high") { recommendedAction = "flag"; verdictLabel = "High Risk"; verdictColor = "error"; urgency = "critical"; }
    else if (riskLevel === "medium" || legitimacyConfidence < 65) { recommendedAction = "review"; verdictLabel = "Needs Review"; verdictColor = "warning"; urgency = "normal"; }
    else { recommendedAction = "approve"; verdictLabel = "Cleared"; verdictColor = "success"; urgency = "low"; }
    // GPT's suggestedPriority wins; fall back to existing priority, auto-escalate if flagged
    let suggestedPriority = gptPriority || reportData.priority || "medium";
    if (shouldFlag && (suggestedPriority === "low" || suggestedPriority === "medium")) suggestedPriority = "high";
    return {
      recommendedAction, verdictLabel, verdictColor, urgency, suggestedPriority,
      legitimacyConfidence, riskLevel, reasoning,
      suspiciousFactors: suspiciousFactors || [], recommendations: recommendations || [],
      shouldFlag, analysisMethod: method || "unknown", analyzedAt: new Date().toISOString(),
      detectedLanguage: detectedLanguage || null,
      reportType: reportType || null,
      tokensUsed: tokensUsed || 0,
    };
  }

  static async autoTriageReport(reportData) {
    try {
      const result = await this.analyzeReport(reportData);
      if (!result.success) {
        const fb = result.fallbackAnalysis || this.fallbackAnalysis(reportData);
        return { success: true, usedFallback: true, triage: this.buildTriageFromAnalysis(fb, reportData) };
      }
      return { success: true, usedFallback: false, triage: this.buildTriageFromAnalysis(result.analysis, reportData) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static fallbackAnalysis(reportData) {
    const suspiciousFactors = []; let suspicionScore = 0;
    const desc = reportData.description || "";
    const title = (reportData.title || "").trim();
    if (desc.length < 15) { suspiciousFactors.push("Very short description"); suspicionScore += 20; }
    if (desc.length < 50 && desc.length >= 15) suspicionScore += 8;
    if (title.length < 5) suspicionScore += 10;
    if (desc.length > 10 && desc === desc.toUpperCase()) { suspiciousFactors.push("All-caps text"); suspicionScore += 15; }
    const specialChars = desc.match(/[!@#$%^&*()]/g);
    if (specialChars && specialChars.length > 5) { suspiciousFactors.push("Excessive special characters"); suspicionScore += 15; }
    const falseCount = reportData.userFalseReportsCount || 0;
    if (falseCount >= 2) { suspiciousFactors.push(`User has ${falseCount} prior false reports`); suspicionScore += 30; }
    // Positive signals: detailed description bumps confidence up
    if (desc.length >= 100) suspicionScore = Math.max(0, suspicionScore - 10);
    const legitimacyConfidence = Math.min(97, Math.max(5, 100 - suspicionScore));
    return {
      isLegitimate: suspicionScore < 40, legitimacyConfidence,
      severity: "medium", credibilityScore: Math.max(10, 100 - suspicionScore),
      riskLevel: suspicionScore > 50 ? "high" : suspicionScore > 28 ? "medium" : "low",
      suspiciousFactors: suspiciousFactors.length ? suspiciousFactors : [],
      recommendations: suspicionScore > 40 ? ["Manual review recommended"] : ["No action required"],
      shouldFlag: suspicionScore > 60,
      reasoning: suspiciousFactors.length ? suspiciousFactors.join(". ") : "Heuristic check passed",
      method: "heuristic_fallback",
    };
  }

  static async testConnection() {
    try {
      const result = await this.analyzeReport({ title: "Test Report", description: "A student reported a safety concern near the campus library.", category: "safety", priority: "medium", anonymous: false, userReportCount: 1 });
      return { success: result.success, message: result.success ? "AI moderation is working!" : "Test failed: " + result.error, method: result.analysis?.method || "unknown" };
    } catch (error) {
      return { success: false, message: "Test failed: " + error.message };
    }
  }
}

export default ModerationService;
