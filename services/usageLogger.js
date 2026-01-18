import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { AppState } from 'react-native';

const STORAGE_KEY = 'usage_log_session';
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

// Feature mapping for tracking
const FEATURES = {
  LOGIN: 'Register & Login',
  SUBMIT_FEEDBACK: 'Submit Inquiry/Feedback',
  SUBMIT_REPORT: 'Incident Report',
  SUBMIT_REPORT_WITH_MEDIA: 'Incident Report with Media',
  PROFILE_IMAGE_UPLOAD: 'Profile Picture Upload',
  COVER_IMAGE_UPLOAD: 'Cover Photo Upload',
  MEDIA_UPLOAD: 'Media Upload (Single)',
  ANONYMOUS_REPORT: 'Anonymous Report',
  TRACK_STATUS: 'Track Status/Notifications',
  CAMPUS_NAVIGATOR: 'Campus Navigator Usage',
  CAMPUS_NAVIGATOR_CALL: 'Campus Navigator - Call Office',
  CAMPUS_NAVIGATOR_EMAIL: 'Campus Navigator - Email Office',
  CAMPUS_NAVIGATOR_NAVIGATE: 'Campus Navigator - Navigation',
  EDIT_PROFILE: 'Edit Profile',
  VIEW_PROFILE: 'View Profile',
  UPVOTE_REPORT: 'Upvote Report',
  COMMENT_REPORT: 'Comment on Report',
  ERROR_RECOVERY: 'Error Recovery',
  ADMIN_UPDATE_STATUS: 'Update Report Status (Admin)',
  ADMIN_MODERATE: 'Moderate Content (Admin)',
  ADMIN_AI_INSIGHTS: 'AI Insights (Admin)',
  ADMIN_DASHBOARD: 'Dashboard/Analytics View (Admin)',
  ADMIN_RESOLVE: 'Resolve/Reject Reports (Admin)',
  ADMIN_USER_STATUS: 'Modify User Status (Admin)',
  ADMIN_SETTINGS: 'System Settings (Admin)',
  ADMIN_DELETE_USER: 'Delete User (Admin)',
};

class UsageLogger {
  constructor() {
    this.currentFeature = null;
    this.sessionLogs = [];
    this.sessionStartTime = null;
    this.testUserCode = null;
    this.appStateSubscription = null;
    this.inactivityTimer = null;
    this.lastActivityTime = new Date();
    this.isBackgrounded = false;
    
    // Set up app state listener
    this.setupAppStateListener();
  }

  // Initialize session with test user code
  async initSession(testUserCode, userId, userEmail, userRole) {
    this.testUserCode = testUserCode;
    this.sessionStartTime = new Date();
    this.sessionLogs = [];
    this.userId = userId;
    this.userEmail = userEmail;
    this.userRole = userRole;
    this.lastActivityTime = new Date();
    this.isBackgrounded = false;

    // Save to AsyncStorage
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      testUserCode,
      userId,
      userEmail,
      userRole,
      sessionStartTime: this.sessionStartTime.toISOString(),
      lastActivityTime: this.lastActivityTime.toISOString(),
      logs: []
    }));

    // Start inactivity detection
    this.startInactivityDetection();

    console.log('Usage logger session initialized:', testUserCode);
  }

  // Set up app state listener to detect when app goes to background
  setupAppStateListener() {
    this.appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('App went to background/inactive - auto-completing session');
        this.isBackgrounded = true;
        await this.autoCompleteSession('App closed or backgrounded');
      } else if (nextAppState === 'active') {
        console.log('App became active');
        this.isBackgrounded = false;
        // Check if we have a pending session that wasn't uploaded
        const hasSession = await this.loadSession();
        if (hasSession) {
          console.log('Resuming previous session');
          this.lastActivityTime = new Date();
        }
      }
    });
  }

  // Start inactivity detection
  startInactivityDetection() {
    this.stopInactivityDetection();
    
    this.inactivityTimer = setInterval(async () => {
      const now = new Date();
      const inactiveTime = now - this.lastActivityTime;
      
      if (inactiveTime >= INACTIVITY_TIMEOUT && !this.isBackgrounded) {
        console.log('User inactive for 30 minutes - auto-completing session');
        await this.autoCompleteSession('User inactive for 30+ minutes');
      }
    }, 60000); // Check every minute
  }

  // Stop inactivity detection
  stopInactivityDetection() {
    if (this.inactivityTimer) {
      clearInterval(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  // Update last activity time
  updateActivity() {
    this.lastActivityTime = new Date();
  }

  // Auto-complete session (for background/inactivity)
  async autoCompleteSession(reason) {
    if (!this.testUserCode) {
      return;
    }

    try {
      // End current feature if any
      if (this.currentFeature) {
        await this.endFeature('Auto-saved due to app closure', reason);
      }

      if (this.sessionLogs.length === 0) {
        console.log('No session logs to save');
        return;
      }

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
        autoCompleted: true,
        completionReason: reason,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString()
      };

      // Upload to Firebase
      const docRef = await addDoc(collection(db, 'usageLogs'), sessionDocument);
      console.log('Usage log auto-uploaded to Firebase:', docRef.id);

      // Clear session
      await AsyncStorage.removeItem(STORAGE_KEY);
      this.reset();

      return docRef.id;
    } catch (error) {
      console.error('Error auto-completing usage logger session:', error);
      // Don't throw - we don't want to crash the app when backgrounding
    }
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
        this.lastActivityTime = parsed.lastActivityTime ? new Date(parsed.lastActivityTime) : new Date();
        
        // Restart inactivity detection
        this.startInactivityDetection();
        
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
    // Update activity time
    this.updateActivity();
    
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

    // Update activity time
    this.updateActivity();

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
        lastActivityTime: this.lastActivityTime?.toISOString(),
        logs: this.sessionLogs
      }));
    } catch (error) {
      console.error('Error saving usage logger session:', error);
    }
  }

  // Complete session and upload to Firebase (manual logout)
  async completeSession() {
    // Stop inactivity detection
    this.stopInactivityDetection();
    
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
        autoCompleted: false,
        completionReason: 'Manual logout',
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
    this.stopInactivityDetection();
    this.currentFeature = null;
    this.sessionLogs = [];
    this.sessionStartTime = null;
    this.testUserCode = null;
    this.userId = null;
    this.userEmail = null;
    this.userRole = null;
    this.lastActivityTime = new Date();
    this.isBackgrounded = false;
  }

  // Cleanup (call this when app is being destroyed)
  cleanup() {
    this.stopInactivityDetection();
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
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
