// services/postModerationService.js
// Real-time AI Moderation for User Posts/Reports
import ModerationService from './moderationService';

export class PostModerationService {
  
  /**
   * Moderate user post/report before publishing to feed
   * @param {Object} postData - Post content to moderate
   * @returns {Object} - { allowed: boolean, reason: string, violationType: string }
   */
  static async moderatePost(postData) {
    try {
      console.log('🛡️ Moderating post before publication...');
      
      const violations = [];
      let primaryViolation = null;
      
      // Step 1: Check title (if exists)
      if (postData.title) {
        const titleCheck = await ModerationService.moderateText(postData.title, 'post_title');
        if (!titleCheck.allowed) {
          violations.push({
            field: 'title',
            category: titleCheck.category,
            reason: titleCheck.reason,
            confidence: titleCheck.confidence
          });
          if (!primaryViolation || titleCheck.confidence > primaryViolation.confidence) {
            primaryViolation = { field: 'Title', ...titleCheck };
          }
        }
      }
      
      // Step 2: Check description/content
      if (postData.description) {
        const contentCheck = await ModerationService.moderateText(postData.description, 'post');
        if (!contentCheck.allowed) {
          violations.push({
            field: 'content',
            category: contentCheck.category,
            reason: contentCheck.reason,
            confidence: contentCheck.confidence
          });
          if (!primaryViolation || contentCheck.confidence > primaryViolation.confidence) {
            primaryViolation = { field: 'Content', ...contentCheck };
          }
        }
      }
      
      // Step 3: Check for malicious links
      const linkCheck = this.checkForMaliciousLinks(postData.description || '');
      if (!linkCheck.safe) {
        violations.push({
          field: 'links',
          category: 'malicious_link',
          reason: linkCheck.reason,
          confidence: 1.0
        });
        primaryViolation = { field: 'Links', ...linkCheck, category: 'malicious_link' };
      }
      
      // Step 4: Check images (if any)
      if (postData.media && postData.media.length > 0) {
        const imageCheck = await ModerationService.moderateImages(postData.media);
        if (!imageCheck.allowed) {
          violations.push({
            field: 'images',
            category: 'inappropriate_image',
            reason: `${imageCheck.flaggedCount} image(s) contain inappropriate content`,
            confidence: 0.9
          });
          if (!primaryViolation) {
            primaryViolation = { 
              field: 'Images', 
              category: 'inappropriate_image',
              reason: `${imageCheck.flaggedCount} image(s) flagged`,
              confidence: 0.9
            };
          }
        }
      }
      
      // If any violations found, reject post
      if (violations.length > 0) {
        return {
          allowed: false,
          reason: this.formatUserMessage(primaryViolation),
          violationType: primaryViolation.category,
          violations: violations,
          confidence: primaryViolation.confidence
        };
      }
      
      // Post is clean
      return {
        allowed: true,
        reason: 'Content passed moderation checks',
        violationType: null,
        violations: []
      };
      
    } catch (error) {
      console.error('Post moderation error:', error);
      // Fail-safe: Allow post but flag for review
      return {
        allowed: true,
        reason: 'Moderation service unavailable',
        violationType: 'moderation_error',
        requiresManualReview: true,
        error: error.message
      };
    }
  }
  
  /**
   * Check for malicious links in text
   */
  static checkForMaliciousLinks(text) {
    // Patterns for suspicious links
    const suspiciousPatterns = [
      /bit\.ly|tinyurl|goo\.gl|ow\.ly/i, // URL shorteners
      /\.tk|\.ml|\.ga|\.cf|\.gq/i,      // Free suspicious TLDs
      /free.*download/i,
      /click.*here.*prize/i,
      /verify.*account/i,
      /update.*payment/i,
      /claim.*reward/i,
      /\.exe|\.apk|\.dmg|\.bat/i,       // Executable files
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(text)) {
        return {
          safe: false,
          reason: 'Suspicious or malicious link detected'
        };
      }
    }
    
    // Check for excessive links (spam indicator)
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlPattern) || [];
    if (urls.length > 3) {
      return {
        safe: false,
        reason: 'Too many links (possible spam)'
      };
    }
    
    return { safe: true };
  }
  
  /**
   * Format user-friendly rejection message
   */
  static formatUserMessage(violation) {
    const messages = {
      'explicit_keyword': '⚠️ Your post contains prohibited words or phrases.',
      'spam': '📧 Your post appears to be spam or contains excessive repeated content.',
      'violence': '⚠️ Your post contains violent, threatening, or harmful content.',
      'sexual': '🔞 Your post contains sexual or explicit content.',
      'harassment': '😡 Your post contains harassing or bullying language.',
      'hate': '💔 Your post contains hate speech or discriminatory content.',
      'self-harm': '🆘 Your post contains references to self-harm.',
      'irrelevant': '❌ Your post does not appear to be school-related or contains nonsense.',
      'privacy': '🔒 Your post may contain private or personal information.',
      'malicious_link': '🔗 Your post contains suspicious or malicious links.',
      'inappropriate_image': '🖼️ One or more images contain inappropriate content.',
      'false': '⚠️ Your post may contain misleading or false information.',
      'unknown': '⚠️ Your post was flagged for review.'
    };
    
    const baseMessage = messages[violation.category] || messages['unknown'];
    
    return `${baseMessage}\n\n${violation.reason}\n\nPlease review our community guidelines and try again.`;
  }
  
  /**
   * Generate admin-facing moderation log
   */
  static createModerationLog(userId, postData, moderationResult) {
    return {
      userId: userId,
      action: moderationResult.allowed ? 'approved' : 'rejected',
      violationType: moderationResult.violationType,
      confidence: moderationResult.confidence || 0,
      title: postData.title || '',
      contentPreview: (postData.description || '').substring(0, 200),
      hasImages: (postData.media && postData.media.length > 0),
      imageCount: postData.media ? postData.media.length : 0,
      violations: moderationResult.violations || [],
      timestamp: new Date(),
      automated: true,
      method: 'ai_moderation'
    };
  }
  
  /**
   * Quick pre-check before full moderation (for UI responsiveness)
   */
  static quickPreCheck(text) {
    // Fast keyword check only - no API calls
    const result = ModerationService.keywordFilter(text);
    
    if (!result.allowed) {
      return {
        passed: false,
        message: this.formatUserMessage({
          category: result.category,
          reason: result.reason
        })
      };
    }
    
    // Check text length for spam
    if (text.length < 10) {
      return {
        passed: false,
        message: '⚠️ Your post is too short. Please provide more details.'
      };
    }
    
    if (text.length > 5000) {
      return {
        passed: false,
        message: '⚠️ Your post is too long. Please keep it under 5000 characters.'
      };
    }
    
    // Check for all caps (spam indicator)
    const words = text.split(/\s+/);
    const allCapsWords = words.filter(w => w.length > 3 && w === w.toUpperCase());
    if (allCapsWords.length > words.length * 0.5) {
      return {
        passed: false,
        message: '📧 Please don\'t use excessive CAPS. It looks like spam.'
      };
    }
    
    return { passed: true };
  }
  
  /**
   * Check if user has been spamming
   */
  static async checkUserSpamHistory(userId) {
    // This would query Firestore for recent posts by user
    // For now, returning a simple check
    // TODO: Implement rate limiting (e.g., max 5 posts per hour)
    return {
      isSpamming: false,
      recentPostCount: 0,
      canPost: true
    };
  }
}

export default PostModerationService;
