// services/reportService.js
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  getDocs,
  where,
  serverTimestamp,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc,
  increment,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { supabase, STORAGE_BUCKET } from '../supabase';
import * as FileSystem from 'expo-file-system/legacy';
import ModerationService from './moderationService';
import PostModerationService from './postModerationService';

export class ReportService {
  
  // Upload images to Supabase Storage
  static async uploadImages(images) {
    try {
      const imageUrls = [];
      
      for (let i = 0; i < images.length; i++) {
        const imageUri = images[i];
        
        // Read file as base64
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        // Create a unique filename
        const timestamp = Date.now();
        const filename = `${timestamp}_${i}.jpg`;
        const filePath = `reports/${filename}`;
        
        // Convert base64 to binary array manually
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let j = 0; j < binaryString.length; j++) {
          bytes[j] = binaryString.charCodeAt(j);
        }
        
        // Upload using XMLHttpRequest (better React Native support)
        const uploadUrl = `https://ghxhfyjjjdtyzxiwwehg.supabase.co/storage/v1/object/${STORAGE_BUCKET}/${filePath}`;
        
        const uploaded = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', uploadUrl);
          xhr.setRequestHeader('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoeGhmeWpqamR0eXp4aXd3ZWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NjgwMjYsImV4cCI6MjA4NDI0NDAyNn0.xqZnryQb9ShZHTPdBHzQGyID6PsQeHiAfn2CEc4rKg0');
          xhr.setRequestHeader('apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoeGhmeWpqamR0eXp4aXd3ZWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NjgwMjYsImV4cCI6MjA4NDI0NDAyNn0.xqZnryQb9ShZHTPdBHzQGyID6PsQeHiAfn2CEc4rKg0');
          xhr.setRequestHeader('Content-Type', 'image/jpeg');
          
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(true);
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
            }
          };
          
          xhr.onerror = () => reject(new Error('Network error during upload'));
          xhr.send(bytes);
        });
        
        // Construct public URL
        const publicUrl = `https://ghxhfyjjjdtyzxiwwehg.supabase.co/storage/v1/object/public/${STORAGE_BUCKET}/${filePath}`;
        imageUrls.push(publicUrl);
      }
      
      return { success: true, urls: imageUrls };
    } catch (error) {
      console.error('Error uploading images:', error);
      return { success: false, error: error.message };
    }
  }

  // Upload single profile image (profile pic or cover photo)
  static async uploadProfileImage(imageUri, type = 'profile') {
    try {
      if (!imageUri) return null;

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Create a unique filename
      const timestamp = Date.now();
      const filename = `${type}_${timestamp}.jpg`;
      const filePath = `profiles/${filename}`;
      
      // Convert base64 to binary array manually
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let j = 0; j < binaryString.length; j++) {
        bytes[j] = binaryString.charCodeAt(j);
      }
      
      // Upload using XMLHttpRequest (better React Native support)
      const uploadUrl = `https://ghxhfyjjjdtyzxiwwehg.supabase.co/storage/v1/object/${STORAGE_BUCKET}/${filePath}`;
      
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', uploadUrl);
        xhr.setRequestHeader('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoeGhmeWpqamR0eXp4aXd3ZWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NjgwMjYsImV4cCI6MjA4NDI0NDAyNn0.xqZnryQb9ShZHTPdBHzQGyID6PsQeHiAfn2CEc4rKg0');
        xhr.setRequestHeader('apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoeGhmeWpqamR0eXp4aXd3ZWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NjgwMjYsImV4cCI6MjA4NDI0NDAyNn0.xqZnryQb9ShZHTPdBHzQGyID6PsQeHiAfn2CEc4rKg0');
        xhr.setRequestHeader('Content-Type', 'image/jpeg');
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(true);
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
          }
        };
        
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(bytes);
      });
      
      // Construct public URL
      const publicUrl = `https://ghxhfyjjjdtyzxiwwehg.supabase.co/storage/v1/object/public/${STORAGE_BUCKET}/${filePath}`;
      return publicUrl;
    } catch (error) {
      console.error('Error uploading profile image:', error);
      return null;
    }
  }
  
  // Submit a new report
  static async submitReport(reportData) {
    try {
      // ===== STEP 1: AI POST MODERATION FOR PUBLIC FEED =====
      // Check if this is a public post (not anonymous, not a complaint)
      const isPublicPost = !reportData.isAnonymous && !reportData.isComplaint;
      
      if (isPublicPost) {
        console.log('🛡️ Running AI post moderation for public feed...');
        
        // Quick pre-check (instant feedback)
        const preCheck = PostModerationService.quickPreCheck(reportData.description || '');
        if (!preCheck.passed) {
          return {
            success: false,
            error: preCheck.message,
            moderationBlocked: true
          };
        }
        
        // Full AI moderation — allow forcing local moderation for testing
        const FORCE_LOCAL = (
          (typeof process !== 'undefined' && process.env && process.env.REACT_APP_FORCE_LOCAL_MODERATION === 'true') ||
          (typeof global !== 'undefined' && global.__FORCE_LOCAL_MODERATION__ === true)
        );
        let postModeration = null;

        if (FORCE_LOCAL) {
          console.log('⚠️ FORCE_LOCAL enabled — using local PostModerationService for testing');
          try {
            postModeration = await PostModerationService.moderatePost({
              title: reportData.title,
              description: reportData.description,
              media: []
            });
          } catch (localErr) {
            console.error('Local PostModerationService failed:', localErr);
            postModeration = { allowed: true, violationType: null, reason: null };
          }
        } else {
          // Call serverless endpoint first (preferred)
          const MODERATION_ENDPOINT =
            process.env.REACT_APP_MODERATION_ENDPOINT ||
            (typeof global !== 'undefined' && global.__MODERATION_ENDPOINT__) ||
            'https://us-central1-your-project.cloudfunctions.net/moderationAnalyze';

          try {
            const resp = await fetch(MODERATION_ENDPOINT, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: reportData.title,
                description: reportData.description,
                media: [],
                userId: reportData.userId || null,
                type: 'post'
              })
            });

            if (resp.ok) {
              const ai = await resp.json();
              postModeration = {
                allowed: !!ai.allowed,
                violationType: ai.violationType || null,
                reason: ai.message || (ai.allowed ? null : 'Blocked by AI'),
                raw: ai
              };
            } else {
              // Non-OK response — log and fall back to local moderation service
              const errBody = await resp.text().catch(() => '');
              console.warn('Moderation endpoint responded with error:', resp.status, errBody);
            }
          } catch (endpointErr) {
            console.warn('Moderation endpoint call failed, falling back to local AI:', endpointErr.message || endpointErr);
          }

          // If endpoint failed to provide a result, use local PostModerationService as fallback
          if (!postModeration) {
            try {
              postModeration = await PostModerationService.moderatePost({
                title: reportData.title,
                description: reportData.description,
                media: []
              });
            } catch (localErr) {
              console.error('Local PostModerationService failed:', localErr);
              // If both remote and local fail, allow by default but log
              postModeration = { allowed: true, violationType: null, reason: null };
            }
          }
        }

        if (!postModeration.allowed) {
          console.warn('⛔ Post blocked by AI moderation:', postModeration.violationType);

          // Log the moderation action (prefer server-provided raw data if present)
          try {
            const moderationLog = (postModeration.raw && postModeration.raw.log)
              ? postModeration.raw.log
              : PostModerationService.createModerationLog(reportData.userId, reportData, postModeration);
            await addDoc(collection(db, 'moderationLogs'), moderationLog);
          } catch (logError) {
            console.error('Failed to log moderation action:', logError);
          }

          // Return user-friendly error message
          return {
            success: false,
            error: postModeration.reason || 'Your post was blocked by automated moderation.',
            moderationBlocked: true,
            violationType: postModeration.violationType
          };
        }
      }

      // ===== STEP 2: CONTENT MODERATION FOR REPORTS/COMPLAINTS =====
      // For anonymous reports and complaints, use standard moderation
      if (!isPublicPost) {
        console.log('🛡️ Running standard content moderation...');
        const moderationResult = await ModerationService.moderateReport({
          title: reportData.title,
          description: reportData.description,
          images: [] // We'll check images after upload to avoid re-fetching
        });

        // If content is blocked, reject immediately
        if (!moderationResult.allowed) {
          console.warn('⛔ Report blocked by moderation:', moderationResult.blockedReasons);
          return {
            success: false,
            error: `Your report was blocked: ${moderationResult.blockedReasons.join(', ')}. ` +
                   'Please remove inappropriate content and try again.',
            moderationBlocked: true
          };
        }
      }

      // ===== STEP 3: UPLOAD IMAGES =====
      let imageUrls = [];
      if (reportData.media && reportData.media.length > 0) {
        const uploadResult = await this.uploadImages(reportData.media);
        if (uploadResult.success) {
          imageUrls = uploadResult.urls;
          
          // ===== STEP 4: MODERATE UPLOADED IMAGES =====
          console.log('🛡️ Moderating uploaded images...');
          const imageModeration = await ModerationService.moderateImages(imageUrls);
          
          if (!imageModeration.allowed) {
            console.warn('⛔ Images blocked by moderation:', imageModeration.flaggedImages);
            // Delete uploaded images since they're inappropriate
            // (Supabase cleanup could be added here if needed)
            return {
              success: false,
              error: `🖼️ ${imageModeration.flaggedCount} image(s) contain inappropriate content.\n\n` +
                     'Images with violence, explicit content, or harmful imagery cannot be posted.\n\n' +
                     'Please remove or replace the flagged images and try again.',
              moderationBlocked: true,
              violationType: 'inappropriate_image'
            };
          }
        } else {
          console.warn('Failed to upload images:', uploadResult.error);
          // Continue with report submission even if images fail
        }
      }
      
      const report = {
        ...reportData,
        media: imageUrls,
        authorUsername: reportData.authorUsername || reportData.authorEmail || 'user',
        authorEmail: reportData.authorEmail || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'pending',
        priority: reportData.priority || 'medium',
        assignedTo: null,
        resolved: false,
        viewCount: 0,
        upvotes: 0,
        downvotes: 0,
        moderationFlags: [],
        aiModerated: isPublicPost, // Flag posts that went through AI moderation
        moderatedAt: new Date().toISOString()
      };

      console.log('Submitting report:', report);
      const docRef = await addDoc(collection(db, 'reports'), report);
      console.log('Report submitted successfully with ID:', docRef.id);
      
      // Update user's report count and check for trophies
      if (reportData.authorId) {
        try {
          const userRef = doc(db, 'users', reportData.authorId);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const currentCount = userData.reportsCount || 0;
            const newCount = currentCount + 1;
            
            // Trophy thresholds
            const trophyMilestones = [1, 5, 10, 25, 50, 100];
            const currentTrophies = userData.trophies || [];
            const trophyIds = ['first_report', 'reporter_5', 'reporter_10', 'reporter_25', 'reporter_50', 'reporter_100'];
            
            // Check if new trophy unlocked
            const newTrophies = [...currentTrophies];
            trophyMilestones.forEach((milestone, index) => {
              if (newCount >= milestone && !currentTrophies.includes(trophyIds[index])) {
                newTrophies.push(trophyIds[index]);
              }
            });
            
            // Update user document
            await updateDoc(userRef, {
              reportsCount: increment(1),
              trophies: newTrophies,
              lastReportDate: serverTimestamp()
            });
            
            console.log('User report count updated. New count:', newCount);
            if (newTrophies.length > currentTrophies.length) {
              console.log('New trophy unlocked!');
            }
          }
        } catch (userUpdateError) {
          console.log('Failed to update user trophy data, but report was saved:', userUpdateError);
        }
      }
      
      // Update analytics
      try {
        await this.updateAnalytics(reportData.category);
      } catch (analyticsError) {
        console.log('Analytics update failed, but report was saved:', analyticsError);
      }
      
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error submitting report:', error);
      
      // Provide more specific error messages
      if (error.code === 'permission-denied') {
        return { 
          success: false, 
          error: 'Permission denied. Please check Firestore security rules.' 
        };
      } else if (error.code === 'unauthenticated') {
        return { 
          success: false, 
          error: 'User not authenticated. Please log in again.' 
        };
      } else {
        return { 
          success: false, 
          error: `Error: ${error.message}` 
        };
      }
    }
  }

  // Update an existing report (within 15 minutes of creation)
  static async updateReport(reportId, reportData) {
    try {
      const reportRef = doc(db, 'reports', reportId);
      
      // Get the current report to check creation time
      const reportSnap = await getDoc(reportRef);
      if (!reportSnap.exists()) {
        return { success: false, error: 'Report not found' };
      }
      
      const currentReport = reportSnap.data();
      const now = new Date();
      const createdAt = currentReport.createdAt?.toDate ? currentReport.createdAt.toDate() : new Date();
      const diffInMinutes = (now - createdAt) / (1000 * 60);
      
      // Check if within 15 minutes
      if (diffInMinutes > 15) {
        return { success: false, error: 'Edit time has expired. Reports can only be edited within 15 minutes.' };
      }
      
      const updatedReport = {
        title: reportData.title,
        description: reportData.description,
        category: reportData.category,
        priority: reportData.priority,
        department: reportData.department,
        location: reportData.location,
        anonymous: reportData.anonymous,
        sentimentScore: reportData.sentimentScore,
        emotion: reportData.emotion,
        tags: reportData.tags,
        slaDeadline: reportData.slaDeadline,
        updatedAt: serverTimestamp()
      };

      await updateDoc(reportRef, updatedReport);
      console.log('Report updated successfully:', reportId);
      
      return { success: true, id: reportId };
    } catch (error) {
      console.error('Error updating report:', error);
      
      if (error.code === 'permission-denied') {
        return { 
          success: false, 
          error: 'Permission denied. You can only edit your own reports.' 
        };
      } else if (error.code === 'unauthenticated') {
        return { 
          success: false, 
          error: 'User not authenticated. Please log in again.' 
        };
      } else {
        return { 
          success: false, 
          error: `Error: ${error.message}` 
        };
      }
    }
  }

  // Get a single report by ID
  static async getReportById(reportId) {
    try {
      const reportRef = doc(db, 'reports', reportId);
      const reportSnap = await getDoc(reportRef);
      
      if (!reportSnap.exists()) {
        return { success: false, error: 'Report not found' };
      }
      
      const reportData = reportSnap.data();
      const report = {
        id: reportSnap.id,
        ...reportData,
        createdAt: reportData.createdAt?.toDate ? reportData.createdAt.toDate() : new Date(),
        updatedAt: reportData.updatedAt?.toDate ? reportData.updatedAt.toDate() : new Date()
      };
      
      return { success: true, report };
    } catch (error) {
      console.error('Error getting report:', error);
      return { success: false, error: error.message };
    }
  }

  // Get reports with real-time updates
  static subscribeToReports(callback, filters = {}) {
    try {
      console.log('Setting up reports subscription with filters:', filters);
      let q = collection(db, 'reports');
      
      // Apply filters
      if (filters.category) {
        q = query(q, where('category', '==', filters.category));
      }
      
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }
      
      // Order by creation date (newest first)
      q = query(q, orderBy('createdAt', 'desc'));
      
      // Limit results
      if (filters.limit) {
        q = query(q, limit(filters.limit));
      }

      return onSnapshot(q, 
        (snapshot) => {
          console.log('Reports snapshot received, size:', snapshot.size);
          const reports = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            // Ensure all required fields have valid values
            const reportData = {
              id: doc.id,
              title: data.title || '',
              description: data.description || '',
              category: data.category || 'other',
              priority: data.priority || 'medium',
              status: data.status || 'pending',
              location: data.location || null,
              media: data.media || [],
              anonymous: Boolean(data.anonymous),
              authorName: data.authorName || 'User',
              authorUsername: data.authorUsername || 'user',
              authorEmail: data.authorEmail || '',
              authorId: data.authorId || '',
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt || new Date()),
              updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt || new Date()),
              upvotes: Number(data.upvotes) || 0,
              viewCount: Number(data.viewCount) || 0,
              commentCount: Number(data.commentCount) || 0
            };
            console.log('Processing report:', doc.id, reportData.title || 'No title');
            reports.push(reportData);
          });
          console.log('Processed reports:', reports);
          callback(reports);
        },
        (error) => {
          console.error('Error in reports subscription:', error);
          callback([]);
        }
      );
    } catch (error) {
      console.error('Error setting up reports subscription:', error);
      callback([]);
      return null;
    }
  }

  // Get recent reports for feed
  static subscribeToFeed(callback, limitCount = 20, currentUserId = null) {
    try {
      console.log('Setting up feed subscription for', limitCount, 'reports');
      
      // Query all reports, we'll filter anonymous ones in the callback
      const q = query(
        collection(db, 'reports'),
        orderBy('createdAt', 'desc'),
        limit(limitCount * 2) // Fetch more to account for filtered anonymous reports
      );

      return onSnapshot(q, 
        (snapshot) => {
          console.log('Feed snapshot received, size:', snapshot.size);
          const reports = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            
            // Filter logic: 
            // - Show all non-anonymous reports
            // - Show anonymous reports only if they belong to current user
            const isAnonymous = Boolean(data.anonymous);
            const isOwnReport = currentUserId && data.authorId === currentUserId;
            
            if (!isAnonymous || isOwnReport) {
              console.log('Processing feed report:', doc.id, data.title);
              reports.push({
                id: doc.id,
                title: data.title || '',
                description: data.description || '',
                category: data.category || 'other',
                priority: data.priority || 'medium',
                status: data.status || 'pending',
                location: data.location || null,
                media: data.media || [],
                anonymous: Boolean(data.anonymous),
                authorName: data.authorName || 'User',
                authorUsername: data.authorUsername || 'user',
                authorEmail: data.authorEmail || '',
                authorId: data.authorId || '',
                authorRole: data.authorRole || null,
                authorProfilePic: data.authorProfilePic || null,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt || new Date()),
                upvotes: Number(data.upvotes) || 0,
                viewCount: Number(data.viewCount) || 0,
                commentCount: Number(data.commentCount) || 0
              });
            }
          });
          
          // Limit to requested count after filtering
          const limitedReports = reports.slice(0, limitCount);
          console.log('Feed reports processed:', limitedReports.length, '(filtered from', snapshot.size, ')');
          callback(limitedReports);
        },
        (error) => {
          console.error('Error in feed subscription:', error);
          console.error('Error details:', error.code, error.message);
          callback([]);
        }
      );
    } catch (error) {
      console.error('Error setting up feed subscription:', error);
      callback([]);
      return null;
    }
  }

  // Update analytics when new report is submitted
  static async updateAnalytics(category) {
    try {
      const analyticsRef = collection(db, 'analytics');
      const today = new Date().toISOString().split('T')[0];
      
      // Update daily stats
      await addDoc(analyticsRef, {
        date: today,
        category: category,
        type: 'report_submitted',
        timestamp: serverTimestamp()
      });
      
    } catch (error) {
      console.error('Error updating analytics:', error);
    }
  }

  // Get analytics data
  static async getAnalytics(dateRange = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - dateRange);

      const q = query(
        collection(db, 'analytics'),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('timestamp', '<=', Timestamp.fromDate(endDate))
      );

      const snapshot = await getDocs(q);
      const analytics = [];
      
      snapshot.forEach((doc) => {
        analytics.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate()
        });
      });

      return this.processAnalyticsData(analytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return null;
    }
  }

  // Process analytics data for dashboard
  static processAnalyticsData(analyticsData) {
    const stats = {
      totalReports: 0,
      pendingReports: 0,
      resolvedReports: 0,
      categoryBreakdown: {},
      recentActivity: []
    };

    analyticsData.forEach(item => {
      if (item.type === 'report_submitted') {
        stats.totalReports++;
        
        // Category breakdown
        if (stats.categoryBreakdown[item.category]) {
          stats.categoryBreakdown[item.category]++;
        } else {
          stats.categoryBreakdown[item.category] = 1;
        }
      }
    });

    return stats;
  }

  // Get reports by category for dashboard
  static async getReportsByCategory() {
    try {
      const snapshot = await getDocs(collection(db, 'reports'));
      const categories = {};
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const category = data.category;
        
        if (categories[category]) {
          categories[category]++;
        } else {
          categories[category] = 1;
        }
      });
      
      return categories;
    } catch (error) {
      console.error('Error fetching reports by category:', error);
      return {};
    }
  }

  // Get reports statistics
  static async getReportsStats() {
    try {
      const snapshot = await getDocs(collection(db, 'reports'));
      const stats = {
        total: 0,
        pending: 0,
        inProgress: 0,
        resolved: 0,
        categories: {}
      };
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        stats.total++;
        
        // Count by status
        switch (data.status) {
          case 'pending':
            stats.pending++;
            break;
          case 'in_progress':
            stats.inProgress++;
            break;
          case 'resolved':
            stats.resolved++;
            break;
        }
        
        // Count by category
        const category = data.category;
        if (stats.categories[category]) {
          stats.categories[category]++;
        } else {
          stats.categories[category] = 1;
        }
      });
      
      return stats;
    } catch (error) {
      console.error('Error fetching reports stats:', error);
      return {
        total: 0,
        pending: 0,
        inProgress: 0,
        resolved: 0,
        categories: {}
      };
    }
  }

  // Get user's submitted reports
  static subscribeToUserReports(userId, callback) {
    try {
      console.log('Setting up user reports subscription for:', userId);
      const q = query(
        collection(db, 'reports'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(q, 
        (snapshot) => {
          console.log('User reports snapshot received, size:', snapshot.size);
          const reports = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            reports.push({
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
              updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
            });
          });
          callback(reports);
        },
        (error) => {
          console.error('Error in user reports subscription:', error);
          callback([]);
        }
      );
    } catch (error) {
      console.error('Error setting up user reports subscription:', error);
      callback([]);
      return null;
    }
  }

  // Delete a report
  static async deleteReport(reportId, userId) {
    try {
      // First verify the report belongs to the user
      const reportRef = doc(db, 'reports', reportId);
      const reportSnap = await getDoc(reportRef);
      
      if (!reportSnap.exists()) {
        return { success: false, error: 'Report not found' };
      }
      
      const reportData = reportSnap.data();
      if (reportData.userId !== userId) {
        return { success: false, error: 'You can only delete your own reports' };
      }
      
      await deleteDoc(reportRef);
      console.log('Report deleted successfully:', reportId);
      return { success: true };
    } catch (error) {
      console.error('Error deleting report:', error);
      return { success: false, error: error.message };
    }
  }

  // Upvote a report
  static async upvoteReport(reportId, userId) {
    try {
      const reportRef = doc(db, 'reports', reportId);
      
      // Get report data to check author
      const reportSnap = await getDoc(reportRef);
      if (!reportSnap.exists()) {
        return { success: false, error: 'Report not found' };
      }
      
      const reportData = reportSnap.data();
      
      // Check if user already voted using query
      const voteQuery = query(
        collection(db, 'votes'),
        where('reportId', '==', reportId),
        where('userId', '==', userId)
      );
      
      const voteSnapshot = await getDocs(voteQuery);
      
      if (!voteSnapshot.empty) {
        // User has already voted, remove the vote
        const voteDoc = voteSnapshot.docs[0];
        await deleteDoc(voteDoc.ref);
        
        await updateDoc(reportRef, {
          upvotes: increment(-1)
        });
        
        return { success: true, action: 'removed', newCount: Math.max((reportData.upvotes || 0) - 1, 0) };
      } else {
        // Add new upvote
        await addDoc(collection(db, 'votes'), {
          reportId,
          userId,
          type: 'upvote',
          timestamp: serverTimestamp()
        });
        
        const newCount = (reportData.upvotes || 0) + 1;
        await updateDoc(reportRef, {
          upvotes: increment(1)
        });
        
        // Create notification for report author if different user
        if (reportData.userId && reportData.userId !== userId) {
          try {
            await this.createNotification(
              reportData.userId,
              'report_upvoted',
              reportId,
              reportData.title,
              'Someone upvoted your report'
            );
          } catch (notifError) {
            console.log('Failed to create upvote notification:', notifError);
          }
        }
        
        return { success: true, action: 'added', newCount };
      }
    } catch (error) {
      console.error('Error upvoting report:', error);
      return { success: false, error: error.message };
    }
  }

  // Track view count
  static async incrementViewCount(reportId, userId) {
    try {
      const reportRef = doc(db, 'reports', reportId);
      const viewRef = doc(db, 'views', `${reportId}_${userId}`);
      
      // Check if user already viewed this report
      const viewSnap = await getDoc(viewRef);
      if (!viewSnap.exists()) {
        // Add view record
        await addDoc(collection(db, 'views'), {
          reportId,
          userId,
          timestamp: serverTimestamp()
        });
        
        // Increment view count
        await updateDoc(reportRef, {
          viewCount: increment(1)
        });
        
        return { success: true };
      }
      
      return { success: true, message: 'Already viewed' };
    } catch (error) {
      console.error('Error incrementing view count:', error);
      return { success: false, error: error.message };
    }
  }

  // Check if user has upvoted a report
  static async getUserVote(reportId, userId) {
    try {
      const voteQuery = query(
        collection(db, 'votes'),
        where('reportId', '==', reportId),
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(voteQuery);
      if (!snapshot.empty) {
        const voteData = snapshot.docs[0].data();
        return { hasVoted: true, voteType: voteData.type || 'upvote' };
      }
      
      return { hasVoted: false, voteType: null };
    } catch (error) {
      console.error('Error checking user vote:', error);
      return { hasVoted: false, voteType: null };
    }
  }

  // Create notification for user
  static async createNotification(userId, type, reportId, reportTitle, message) {
    try {
      const notification = {
        userId,
        type, // 'report_resolved', 'report_upvoted', 'report_commented'
        reportId,
        reportTitle,
        message,
        read: false,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'notifications'), notification);
      console.log('Notification created:', docRef.id);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error creating notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user notifications
  static subscribeToNotifications(userId, callback) {
    try {
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const unsubscribe = onSnapshot(
        notificationsQuery,
        (snapshot) => {
          const notifications = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            notifications.push({
              id: doc.id,
              type: data.type || 'general',
              message: data.message || '',
              reportTitle: data.reportTitle || '',
              reportId: data.reportId || '',
              userId: data.userId || '',
              read: Boolean(data.read),
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt || new Date()),
              readAt: data.readAt?.toDate ? data.readAt.toDate() : data.readAt
            });
          });
          callback(notifications);
        },
        (error) => {
          console.error('Error in notifications subscription:', error);
          callback([]);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up notifications subscription:', error);
      callback([]);
      return null;
    }
  }

  // Mark notification as read
  static async markNotificationAsRead(notificationId) {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true,
        readAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, error: error.message };
    }
  }

  // Mark all notifications as read
  static async markAllNotificationsAsRead(userId) {
    try {
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(notificationsQuery);
      const batch = [];

      snapshot.forEach((doc) => {
        batch.push(updateDoc(doc.ref, {
          read: true,
          readAt: serverTimestamp()
        }));
      });

      await Promise.all(batch);
      return { success: true };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return { success: false, error: error.message };
    }
  }

  // Get unread notification count
  static subscribeToUnreadCount(userId, callback) {
    try {
      const unreadQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const unsubscribe = onSnapshot(
        unreadQuery,
        (snapshot) => {
          callback(snapshot.size);
        },
        (error) => {
          console.error('Error in unread count subscription:', error);
          callback(0);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up unread count subscription:', error);
      callback(0);
      return null;
    }
  }

  // Update report status (for admin use)
  static async updateReportStatus(reportId, newStatus, adminUserId) {
    try {
      const reportRef = doc(db, 'reports', reportId);
      const reportSnap = await getDoc(reportRef);
      
      if (!reportSnap.exists()) {
        return { success: false, error: 'Report not found' };
      }
      
      const reportData = reportSnap.data();
      const oldStatus = reportData.status;
      
      await updateDoc(reportRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
        ...(newStatus === 'resolved' && { resolvedAt: serverTimestamp() })
      });
      
      // Create notification for report author if status changed to resolved
      if (newStatus === 'resolved' && oldStatus !== 'resolved' && reportData.userId) {
        try {
          await this.createNotification(
            reportData.userId,
            'report_resolved',
            reportId,
            reportData.title,
            'Your report has been resolved'
          );
        } catch (notifError) {
          console.log('Failed to create resolution notification:', notifError);
        }
      }
      
      console.log('Report status updated successfully:', reportId);
      return { success: true };
    } catch (error) {
      console.error('Error updating report status:', error);
      return { success: false, error: error.message };
    }
  }

  // Reset all upvote counts (admin function)
  static async resetAllUpvoteCounts() {
    try {
      // Get all reports
      const reportsQuery = query(collection(db, 'reports'));
      const reportsSnapshot = await getDocs(reportsQuery);
      
      // Reset upvotes for each report
      const updatePromises = [];
      reportsSnapshot.forEach((doc) => {
        updatePromises.push(updateDoc(doc.ref, {
          upvotes: 0,
          downvotes: 0
        }));
      });
      
      // Delete all votes
      const votesQuery = query(collection(db, 'votes'));
      const votesSnapshot = await getDocs(votesQuery);
      const deletePromises = [];
      votesSnapshot.forEach((doc) => {
        deletePromises.push(deleteDoc(doc.ref));
      });
      
      await Promise.all([...updatePromises, ...deletePromises]);
      
      console.log('All upvote counts reset successfully');
      return { success: true };
    } catch (error) {
      console.error('Error resetting upvote counts:', error);
      return { success: false, error: error.message };
    }
  }

  // Add a comment to a report
  static async addComment(reportId, commentData) {
    try {
      const comment = {
        ...commentData,
        createdAt: serverTimestamp(),
        reportId
      };

      const docRef = await addDoc(collection(db, 'comments'), comment);
      
      // Update comment count on the report
      const reportRef = doc(db, 'reports', reportId);
      await updateDoc(reportRef, {
        commentCount: increment(1)
      });

      console.log('Comment added successfully with ID:', docRef.id);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error adding comment:', error);
      return { success: false, error: error.message };
    }
  }

  // Get comments for a report
  static async getComments(reportId) {
    try {
      const q = query(
        collection(db, 'comments'),
        where('reportId', '==', reportId),
        orderBy('createdAt', 'asc')
      );
      
      const snapshot = await getDocs(q);
      const comments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));

      return { success: true, comments };
    } catch (error) {
      console.error('Error getting comments:', error);
      return { success: false, error: error.message, comments: [] };
    }
  }

  // Delete a comment (only by comment author)
  static async deleteComment(commentId, userId) {
    try {
      const commentDoc = await getDoc(doc(db, 'comments', commentId));
      
      if (!commentDoc.exists()) {
        return { success: false, error: 'Comment not found' };
      }

      const commentData = commentDoc.data();
      
      // Check if user is the author of the comment
      if (commentData.authorId !== userId) {
        return { success: false, error: 'You can only delete your own comments' };
      }

      await deleteDoc(doc(db, 'comments', commentId));
      
      // Update comment count on the report
      const reportRef = doc(db, 'reports', commentData.reportId);
      await updateDoc(reportRef, {
        commentCount: increment(-1)
      });

      console.log('Comment deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('Error deleting comment:', error);
      return { success: false, error: error.message };
    }
  }
}
