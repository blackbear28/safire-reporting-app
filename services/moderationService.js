// services/moderationService.js
// Content Moderation Service using Free AI Models
import AsyncStorage from '@react-native-async-storage/async-storage';

// SETUP INSTRUCTIONS:
// 1. Google Perspective API: Get free key from https://developers.perspectiveapi.com/s/docs-get-started
// 2. Hugging Face: Get free key from https://huggingface.co/settings/tokens
// 
// OPTION 1 (RECOMMENDED): Use environment variables
//   - Create .env file in project root
//   - Add: REACT_APP_PERSPECTIVE_API_KEY=your_key_here
//   - Add: REACT_APP_HUGGINGFACE_TOKEN=your_token_here
//
// OPTION 2: Hardcode below (less secure, but works)
//   - Replace 'YOUR_PERSPECTIVE_API_KEY' with your actual key
//   - Replace 'YOUR_HUGGING_FACE_TOKEN' with your actual token
//
// OPTION 3: Use AsyncStorage (configured in ModerationSettingsScreen)

// Storage keys
const STORAGE_KEYS = {
  PERSPECTIVE_API_KEY: '@moderation_perspective_key',
  HUGGING_FACE_TOKEN: '@moderation_hf_token',
};

// Priority: Environment Variables > Hardcoded > AsyncStorage > None
// PASTE YOUR API KEYS HERE (if not using .env file):
let PERSPECTIVE_API_KEY = process.env.REACT_APP_PERSPECTIVE_API_KEY || 'YOUR_PERSPECTIVE_API_KEY';
let HUGGING_FACE_TOKEN = process.env.REACT_APP_HUGGINGFACE_TOKEN || 'YOUR_HUGGING_FACE_TOKEN';

// API Endpoints
const PERSPECTIVE_API_URL = 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze';
const HF_IMAGE_MODERATION_URL = 'https://api-inference.huggingface.co/models/Falconsai/nsfw_image_detection';

export class ModerationService {
  
  // Initialize by loading saved API keys
  static async initialize() {
    try {
      const savedPerspective = await AsyncStorage.getItem(STORAGE_KEYS.PERSPECTIVE_API_KEY);
      const savedHF = await AsyncStorage.getItem(STORAGE_KEYS.HUGGING_FACE_TOKEN);
      
      if (savedPerspective) PERSPECTIVE_API_KEY = savedPerspective;
      if (savedHF) HUGGING_FACE_TOKEN = savedHF;
      
      console.log('🛡️ Moderation service initialized:', this.getStatus().message);
    } catch (error) {
      console.warn('Failed to load saved API keys:', error);
    }
  }

  // Save API keys to persistent storage
  static async saveApiKeys(perspectiveKey, hfToken) {
    try {
      if (perspectiveKey) {
        await AsyncStorage.setItem(STORAGE_KEYS.PERSPECTIVE_API_KEY, perspectiveKey);
        PERSPECTIVE_API_KEY = perspectiveKey;
      }
      if (hfToken) {
        await AsyncStorage.setItem(STORAGE_KEYS.HUGGING_FACE_TOKEN, hfToken);
        HUGGING_FACE_TOKEN = hfToken;
      }
      console.log('✅ API keys saved successfully');
      return { success: true };
    } catch (error) {
      console.error('Failed to save API keys:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // TEXT MODERATION
  // ========================================
  
  /**
   * Moderate text content for inappropriate or non-school-related content
   * @param {string} text - The text to moderate
   * @param {string} context - Context type: 'report', 'post', 'comment', etc.
   * @returns {Object} - { allowed: boolean, reason: string, confidence: number, category: string }
   */
  static async moderateText(text, context = 'report') {
    try {
      // Step 1: Fast keyword pre-screening (instant blocking)
      const keywordCheck = this.keywordFilter(text);
      if (!keywordCheck.allowed) {
        return {
          allowed: false,
          reason: keywordCheck.reason,
          confidence: 1.0,
          category: keywordCheck.category,
          method: 'keyword'
        };
      }

      // Step 2: ALWAYS run AI analysis (even if keyword filter passed)
      const isAIEnabled = this.isConfigured().perspective;
      
      if (!isAIEnabled) {
        // AI not configured - allow with warning
        console.log('⚠️ AI moderation not configured, relying on keyword filter only');
        return {
          allowed: true,
          reason: 'Passed keyword filter (AI moderation not configured)',
          confidence: 0.5,
          category: 'keyword_only',
          method: 'keyword',
          requiresManualReview: true
        };
      }

      console.log('🤖 Running Perspective API analysis (real-time)...');
      // Step 3: Deep AI moderation with Perspective API (ALWAYS runs for configured systems)
      const aiModeration = await this.moderateTextWithPerspective(text, context);
      
      return aiModeration;
    } catch (error) {
      console.error('Text moderation error:', error);
      // Fail-safe: Allow content but log for manual review
      return {
        allowed: true,
        reason: 'Moderation service unavailable',
        confidence: 0,
        category: 'unknown',
        requiresManualReview: true,
        error: error.message
      };
    }
  }

  /**
   * Fast keyword-based filtering (no API calls)
   */
  static keywordFilter(text) {
    const lowerText = text.toLowerCase();

    // Explicit harmful keywords (immediate rejection)
    const explicitKeywords = [
      // Violence
      'kill', 'murder', 'bomb', 'explosive', 'weapon', 'gun', 'knife attack',
      'suicide', 'self-harm', 'hurt myself', 'end my life',
      // Sexual content and dirty talk
      'porn', 'nude', 'xxx', 'sex video', 'explicit', 'naked', 'nudes',
      'send nudes', 'dick pic', 'pussy pic', 'boobs', 'tits', 'ass pic',
      'sex chat', 'sext', 'sexting', 'horny', 'masturbate', 'jerk off',
      'blow job', 'blowjob', 'hand job', 'handjob', 'oral sex', 'anal sex',
      'make love', 'fuck me', 'wanna fuck', 'lets fuck', 'hook up',
      'one night stand', 'fwb', 'friends with benefits', 'booty call',
      'cum', 'orgasm', 'climax', 'erection', 'boner', 'hard on',
      'wet dream', 'sexual fantasy', 'kinky', 'fetish', 'bdsm',
      'penetrate', 'penetration', 'intercourse', 'foreplay',
      'virgin', 'virginity', 'deflower', 'cherry pop',
      // Profanity and derogatory terms (English)
      'fuck', 'fucking', 'fucked', 'bitch', 'shit', 'damn', 'ass hole', 'asshole',
      'bastard', 'slut', 'whore', 'cunt', 'dick', 'cock', 'pussy',
      'freaky ass', 'dumbass', 'jackass',
      // Harassment/bullying keywords
      'harass', 'harassment', 'bully', 'bullying',
      // Hate speech
      'racial slur', 'hate group', 'discriminate',
      // Filipino profanity and derogatory terms
      'putangina', 'putang ina', 'tangina', 'tang ina', 'puta', 'gago', 'gaga',
      'bobo', 'tanga', 'ulol', 'hayop', 'hayop ka', 'tarantado', 'tarantada',
      'leche', 'yawa', 'hinayupak', 'kupal', 'pokpok', 'salbahe',
      'inutil', 'ungas', 'siraulo', 'lintik', 'punyeta', 'punyemas',
      'buwisit', 'walang hiya', 'wala kang hiya', 'shunga',
      // Illegal activities
      'drugs for sale', 'buy weed', 'cocaine', 'methamphetamine'
    ];

    for (const keyword of explicitKeywords) {
      if (lowerText.includes(keyword)) {
        return {
          allowed: false,
          reason: 'Content contains prohibited keywords',
          category: 'explicit_keyword'
        };
      }
    }

    // Spam patterns
    const spamPatterns = [
      /(.)\1{10,}/, // Repeated characters (10+)
      /^[A-Z\s!]{50,}$/, // All caps long text
      /(click here|buy now|limited offer|congratulations you won)/i,
    ];

    for (const pattern of spamPatterns) {
      if (pattern.test(text)) {
        return {
          allowed: false,
          reason: 'Content appears to be spam',
          category: 'spam'
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check if text is school-related (not used with Perspective API)
   * Perspective focuses on toxicity detection, not content relevance
   */
  static async checkSchoolRelevance(text, context) {
    // Skip relevance check - Perspective API doesn't support it
    return { allowed: true, confidence: 1.0 };
  }


  /**
   * Deep AI moderation using Gemini
   */
  /**
   * Deep AI moderation using Google Perspective API
   */
  static async moderateTextWithPerspective(text, context) {
    try {
      if (!PERSPECTIVE_API_KEY || PERSPECTIVE_API_KEY === 'YOUR_PERSPECTIVE_API_KEY') {
        throw new Error('Perspective API key not configured');
      }

      const response = await fetch(`${PERSPECTIVE_API_URL}?key=${PERSPECTIVE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: { text: text },
          languages: ['en'],
          requestedAttributes: {
            TOXICITY: {},
            SEVERE_TOXICITY: {},
            IDENTITY_ATTACK: {},
            INSULT: {},
            PROFANITY: {},
            THREAT: {},
            SEXUALLY_EXPLICIT: {}
          }
        })
      });

      const data = await response.json();
      
      if (!data.attributeScores) {
        throw new Error('Invalid Perspective API response');
      }

      // Extract scores (0.0 to 1.0)
      const scores = {
        toxicity: data.attributeScores.TOXICITY?.summaryScore?.value || 0,
        severeToxicity: data.attributeScores.SEVERE_TOXICITY?.summaryScore?.value || 0,
        identityAttack: data.attributeScores.IDENTITY_ATTACK?.summaryScore?.value || 0,
        insult: data.attributeScores.INSULT?.summaryScore?.value || 0,
        profanity: data.attributeScores.PROFANITY?.summaryScore?.value || 0,
        threat: data.attributeScores.THREAT?.summaryScore?.value || 0,
        sexuallyExplicit: data.attributeScores.SEXUALLY_EXPLICIT?.summaryScore?.value || 0
      };

      // Determine if content should be blocked (threshold: 0.7)
      const threshold = 0.7;
      let blocked = false;
      let category = 'safe';
      let maxScore = 0;
      let reason = 'Content is appropriate';

      if (scores.severeToxicity > threshold) {
        blocked = true;
        category = 'severe_toxicity';
        maxScore = scores.severeToxicity;
        reason = 'Content contains severe toxic language';
      } else if (scores.threat > threshold) {
        blocked = true;
        category = 'threat';
        maxScore = scores.threat;
        reason = 'Content contains threatening language';
      } else if (scores.sexuallyExplicit > threshold) {
        blocked = true;
        category = 'sexual';
        maxScore = scores.sexuallyExplicit;
        reason = 'Content contains sexually explicit language';
      } else if (scores.identityAttack > threshold) {
        blocked = true;
        category = 'hate';
        maxScore = scores.identityAttack;
        reason = 'Content contains identity-based attacks';
      } else if (scores.insult > threshold) {
        blocked = true;
        category = 'harassment';
        maxScore = scores.insult;
        reason = 'Content contains insulting language';
      } else if (scores.toxicity > threshold) {
        blocked = true;
        category = 'toxicity';
        maxScore = scores.toxicity;
        reason = 'Content is toxic';
      } else if (scores.profanity > threshold) {
        blocked = true;
        category = 'profanity';
        maxScore = scores.profanity;
        reason = 'Content contains profanity';
      }

      return {
        allowed: !blocked,
        reason: reason,
        confidence: blocked ? maxScore : (1 - Math.max(...Object.values(scores))),
        category: category,
        method: 'perspective_api',
        scores: scores
      };
    } catch (error) {
      console.error('Perspective API moderation error:', error);
      throw error;
    }
  }

  // ========================================
  // IMAGE MODERATION
  // ========================================

  /**
   * Moderate image content for violent, sexual, or harmful imagery
   * @param {string} imageUrl - Public URL or base64 of the image
   * @returns {Object} - { allowed: boolean, reason: string, confidence: number, categories: Object }
   */
  static async moderateImage(imageUrl) {
    try {
      // Check if AI is available
      const config = this.isConfigured();
      
      if (!config.huggingface) {
        // No AI configured - allow image but flag for manual review
        console.log('ℹ️ Image moderation not configured, flagging for manual review');
        return {
          allowed: true,
          reason: 'Image moderation not configured',
          confidence: 0,
          requiresManualReview: true,
          method: 'none'
        };
      }

      // Use HuggingFace for image moderation
      if (config.huggingface) {
        return await this.moderateImageWithHuggingFace(imageUrl);
      }

      // Should not reach here, but just in case
      return {
        allowed: true,
        reason: 'No image moderation available',
        confidence: 0,
        requiresManualReview: true
      };
    } catch (error) {
      console.warn('Image moderation error:', error.message);
      // Fail-safe: Allow image but require manual review
      return {
        allowed: true,
        reason: 'Image moderation service unavailable',
        confidence: 0,
        requiresManualReview: true,
        error: error.message
      };
    }
  }

  /**
   * Moderate image using Hugging Face (NSFW detection)
   */
  static async moderateImageWithHuggingFace(imageUrl) {
    try {
      // Fetch image as blob
      const imageResponse = await fetch(imageUrl);
      const blob = await imageResponse.blob();

      // Send to Hugging Face
      const response = await fetch(HF_IMAGE_MODERATION_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUGGING_FACE_TOKEN}`,
        },
        body: blob
      });

      const results = await response.json();
      
      // Hugging Face returns array of [{label: 'nsfw', score: 0.9}, {label: 'normal', score: 0.1}]
      const nsfwResult = results.find(r => r.label.toLowerCase() === 'nsfw');
      const nsfwScore = nsfwResult ? nsfwResult.score : 0;

      const allowed = nsfwScore < 0.5; // Threshold: 50%

      return {
        allowed: allowed,
        reason: allowed ? 'Image passed NSFW check' : 'Image detected as NSFW',
        confidence: Math.abs(nsfwScore - 0.5) * 2, // Convert to 0-1 confidence
        categories: { nsfw: nsfwScore },
        method: 'huggingface'
      };
    } catch (error) {
      console.error('HuggingFace moderation error:', error);
      throw error;
    }
  }

  // ========================================
  // BATCH MODERATION
  // ========================================

  /**
   * Moderate multiple images at once
   */
  static async moderateImages(imageUrls) {
    const results = await Promise.all(
      imageUrls.map(url => this.moderateImage(url).catch(err => ({
        allowed: true,
        error: err.message,
        requiresManualReview: true
      })))
    );

    const allAllowed = results.every(r => r.allowed);
    const flaggedImages = results
      .map((r, i) => ({ index: i, url: imageUrls[i], ...r }))
      .filter(r => !r.allowed);

    return {
      allowed: allAllowed,
      results: results,
      flaggedCount: flaggedImages.length,
      flaggedImages: flaggedImages
    };
  }

  /**
   * Moderate report submission (text + images)
   */
  static async moderateReport(reportData) {
    const results = {
      allowed: true,
      blockedReasons: [],
      warnings: [],
      requiresManualReview: false
    };

    // Moderate title
    if (reportData.title) {
      const titleCheck = await this.moderateText(reportData.title, 'report_title');
      if (!titleCheck.allowed) {
        results.allowed = false;
        results.blockedReasons.push(`Title: ${titleCheck.reason}`);
      }
    }

    // Moderate description
    if (reportData.description) {
      const descCheck = await this.moderateText(reportData.description, 'report');
      if (!descCheck.allowed) {
        results.allowed = false;
        results.blockedReasons.push(`Description: ${descCheck.reason}`);
      }
    }

    // Moderate images
    if (reportData.images && reportData.images.length > 0) {
      const imageCheck = await this.moderateImages(reportData.images);
      if (!imageCheck.allowed) {
        results.allowed = false;
        results.blockedReasons.push(
          `Images: ${imageCheck.flaggedCount} image(s) contain inappropriate content`
        );
      }
    }

    // Check for manual review flags
    results.requiresManualReview = 
      results.blockedReasons.some(r => r.includes('unavailable')) ||
      results.blockedReasons.some(r => r.includes('Unable to verify'));

    return results;
  }

  // ========================================
  // HELPER FUNCTIONS
  // ========================================

  /**
   * Convert blob to base64
   */
  static async blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }


  /**
   * Extract values from AI responses
   */
  static extractCategory(text) {
    const match = text.match(/CATEGORY:\s*(\w+)/i);
    return match ? match[1].toLowerCase() : 'unknown';
  }

  static extractConfidence(text) {
    const match = text.match(/CONFIDENCE:\s*([\d.]+)/i);
    return match ? parseFloat(match[1]) : 0.5;
  }

  static extractReason(text) {
    const match = text.match(/REASON:\s*(.+)/i);
    return match ? match[1].trim() : '';
  }

  static extractScore(text, label) {
    const match = text.match(new RegExp(`${label}:\\s*([\\d.]+)`, 'i'));
    return match ? parseFloat(match[1]) : 0;
  }

  /**
   * Check if moderation service is configured
   */
  static isConfigured() {
    return {
      perspective: PERSPECTIVE_API_KEY && PERSPECTIVE_API_KEY !== 'YOUR_PERSPECTIVE_API_KEY',
      huggingface: HUGGING_FACE_TOKEN && HUGGING_FACE_TOKEN !== 'YOUR_HUGGING_FACE_TOKEN'
    };
  }

  /**
   * Get service status
   */
  static getStatus() {
    const config = this.isConfigured();
    return {
      enabled: config.perspective || config.huggingface,
      textModeration: config.perspective ? 'perspective_api' : 'keywords_only',
      imageModeration: config.huggingface ? 'huggingface' : 'disabled',
      message: config.perspective ? 'Full moderation active (Perspective API)' : 'Limited moderation (configure API keys for full protection)'
    };
  }
}

export default ModerationService;
