import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const STORAGE_KEY = 'usage_log_session';

// Feature mapping for tracking
const FEATURES = {
  LOGIN: 'Register & Login',
  SUBMIT_FEEDBACK: 'Submit Inquiry/Feedback',
  SUBMIT_REPORT: 'Incident Report',
  SUBMIT_REPORT_WITH_MEDIA: 'Incident + Media',
  MEDIA_ATTEMPTED_NO_STORAGE: 'Media Upload Attempted (No Firebase Storage)',
  ANONYMOUS_REPORT: 'Anonymous Report',
  TRACK_STATUS: 'Track Status/Notifs',
  ERROR_RECOVERY: 'Error Recovery',
  ADMIN_UPDATE_STATUS: 'Update Status (Admin)',
  ADMIN_MODERATE: 'Moderate Content (Admin)',
  ADMIN_AI_INSIGHTS: 'AI Insights (Admin)',
  ADMIN_DASHBOARD: 'Reviewing Dashboard/Anti-False Reporting stats (Admin)',
  ADMIN_RESOLVE: 'Resolving or Rejecting reports (Admin)',
  ADMIN_USER_STATUS: 'Modifying User Status (Active/Suspended) (Admin)',
  ADMIN_SETTINGS: 'Configuring SMTP/System Settings (Admin)',
};

class UsageLogger {
  constructor() {
    this.currentFeature = null;
    this.sessionLogs = [];
    this.sessionStartTime = null;
    this.testUserCode = null;
  }

  // Initialize session with test user code
  async initSession(testUserCode, userId, userEmail, userRole) {
    this.testUserCode = testUserCode;
    this.sessionStartTime = new Date();
    this.sessionLogs = [];
    this.userId = userId;
    this.userEmail = userEmail;
    this.userRole = userRole;

    // Save to AsyncStorage
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      testUserCode,
      userId,
      userEmail,
      userRole,
      sessionStartTime: this.sessionStartTime.toISOString(),
      logs: []
    }));

    console.log('Usage logger session initialized:', testUserCode);
  }

  // Load existing session
  async loadSession() {
    try {
      const sessionData = await AsyncStorage.getItem(STORAGE_KEY);
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        this.testUserCode = parsed.testUserCode;
        this.sessionStartTime = new Date(parsed.sessionStartTime);
        this.sessionLogs = parsed.logs || [];
        this.userId = parsed.userId;
        this.userEmail = parsed.userEmail;
        this.userRole = parsed.userRole;
        console.log('Usage logger session loaded');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading usage logger session:', error);
      return false;
    }
  }

  // Start tracking a feature
  async startFeature(featureKey, additionalData = {}) {
    // End current feature if exists
    if (this.currentFeature) {
      await this.endFeature();
    }

    const featureName = FEATURES[featureKey] || featureKey;
    const startTime = new Date();

    this.currentFeature = {
      feature: featureName,
      featureKey: featureKey,
      startTime: startTime,
      startTimeStr: startTime.toLocaleString(),
      additionalData
    };

    console.log('Started tracking feature:', featureName);
  }

  // Track media upload attempt
  async trackMediaAttempt(hasFirebaseStorage, mediaCount = 0) {
    if (!hasFirebaseStorage && mediaCount > 0) {
      // Log that user tried to use media but storage isn't configured
      await this.startFeature('MEDIA_ATTEMPTED_NO_STORAGE', {
        attemptedMediaCount: mediaCount,
        storageConfigured: false
      });
      await this.endFeature(
        'Attempted but Firebase Storage not configured',
        'Firebase Storage not set up - media upload unavailable'
      );
    }
  }

  // Check if current feature should be upgraded to include media
  upgradeToMediaFeature(hasMedia) {
    if (this.currentFeature && hasMedia) {
      if (this.currentFeature.featureKey === 'SUBMIT_REPORT') {
        this.currentFeature.feature = FEATURES.SUBMIT_REPORT_WITH_MEDIA;
        this.currentFeature.featureKey = 'SUBMIT_REPORT_WITH_MEDIA';
        this.currentFeature.additionalData.hasMedia = true;
        console.log('Upgraded feature to include media');
      }
    }
  }

  // End tracking current feature
  async endFeature(success = 'Successful, no assistance', issues = '') {
    if (!this.currentFeature) return;

    const endTime = new Date();
    const durationMs = endTime - this.currentFeature.startTime;
    const durationMinutes = (durationMs / 60000).toFixed(2); // Convert to minutes

    const logEntry = {
      task: this.currentFeature.feature,
      featureKey: this.currentFeature.featureKey,
      startTime: this.currentFeature.startTimeStr,
      endTime: endTime.toLocaleString(),
      durationMinutes: parseFloat(durationMinutes),
      success: success,
      problemIssues: issues,
      timestamp: endTime.toISOString(),
      ...this.currentFeature.additionalData
    };

    this.sessionLogs.push(logEntry);

    // Save to AsyncStorage
    await this.saveSession();

    console.log('Ended feature:', this.currentFeature.feature, 'Duration:', durationMinutes, 'min');

    this.currentFeature = null;
  }

  // Save session to AsyncStorage
  async saveSession() {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        testUserCode: this.testUserCode,
        userId: this.userId,
        userEmail: this.userEmail,
        userRole: this.userRole,
        sessionStartTime: this.sessionStartTime?.toISOString(),
        logs: this.sessionLogs
      }));
    } catch (error) {
      console.error('Error saving usage logger session:', error);
    }
  }

  // Complete session and upload to Firebase
  async completeSession() {
    // End current feature if any
    if (this.currentFeature) {
      await this.endFeature();
    }

    if (!this.testUserCode || this.sessionLogs.length === 0) {
      console.log('No session to complete');
      return null;
    }

    try {
      const sessionEndTime = new Date();
      const totalDuration = (sessionEndTime - this.sessionStartTime) / 60000; // minutes

      // Prepare document for Firebase
      const sessionDocument = {
        testUserCode: this.testUserCode,
        userId: this.userId,
        userEmail: this.userEmail,
        userRole: this.userRole,
        sessionStartTime: this.sessionStartTime.toISOString(),
        sessionEndTime: sessionEndTime.toISOString(),
        totalDurationMinutes: parseFloat(totalDuration.toFixed(2)),
        logs: this.sessionLogs,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString()
      };

      // Upload to Firebase
      const docRef = await addDoc(collection(db, 'usageLogs'), sessionDocument);
      console.log('Usage log uploaded to Firebase:', docRef.id);

      // Clear session
      await AsyncStorage.removeItem(STORAGE_KEY);
      this.reset();

      return docRef.id;
    } catch (error) {
      console.error('Error completing usage logger session:', error);
      throw error;
    }
  }

  // Generate TXT format for the log
  generateTxtLog() {
    if (!this.testUserCode || this.sessionLogs.length === 0) {
      return 'No usage data available';
    }

    let txt = `TEST USER CODE NAME: ${this.testUserCode}\n`;
    txt += `User Email: ${this.userEmail}\n`;
    txt += `User Role: ${this.userRole}\n`;
    txt += `Session Start: ${this.sessionStartTime?.toLocaleString()}\n`;
    txt += `\n========================================\n`;
    txt += `Task Completion Data Collection Instrument\n`;
    txt += `========================================\n\n`;

    this.sessionLogs.forEach((log, index) => {
      txt += `${index + 1}. ${log.task}\n`;
      txt += `   Start time: ${log.startTime}\n`;
      txt += `   End time: ${log.endTime}\n`;
      txt += `   Time (minutes): ${log.durationMinutes}\n`;
      txt += `   Success: ${log.success}\n`;
      txt += `   Problem/Issues: ${log.problemIssues || 'None'}\n`;
      
      // Show media-related info if available
      if (log.hasMedia) {
        txt += `   ℹ️ Note: Report included media attachment\n`;
      }
      if (log.attemptedMediaCount) {
        txt += `   ⚠️ Note: User attempted to upload ${log.attemptedMediaCount} media file(s) but Firebase Storage is not configured\n`;
      }
      if (log.storageConfigured === false) {
        txt += `   ⚠️ System Status: Media upload unavailable (Firebase Storage not set up)\n`;
      }
      
      txt += `\n`;
    });

    const totalDuration = this.sessionLogs.reduce((sum, log) => sum + log.durationMinutes, 0);
    txt += `========================================\n`;
    txt += `Total Time Logged: ${totalDuration.toFixed(2)} minutes\n`;
    txt += `Number of Features Used: ${this.sessionLogs.length}\n`;
    txt += `========================================\n`;

    return txt;
  }

  // Reset logger
  reset() {
    this.currentFeature = null;
    this.sessionLogs = [];
    this.sessionStartTime = null;
    this.testUserCode = null;
    this.userId = null;
    this.userEmail = null;
    this.userRole = null;
  }

  // Get current session info
  getSessionInfo() {
    return {
      testUserCode: this.testUserCode,
      isActive: !!this.sessionStartTime,
      currentFeature: this.currentFeature?.feature,
      logsCount: this.sessionLogs.length
    };
  }
}

// Export singleton instance
export const usageLogger = new UsageLogger();
export { FEATURES };
