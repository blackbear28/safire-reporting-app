// Appeal Service - ISO 21001:2018 Compliant
// Handles complaint appeals with multi-level approval workflow
// Reference: MO-4.16 Handling Complaint's Appeals

import { db } from '../firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';

// Notification helper function
const createNotification = async (userId, title, body, data = {}) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      title,
      body,
      data,
      read: false,
      createdAt: serverTimestamp()
    });
    console.log(`Notification sent to user ${userId}: ${title}`);
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};

// Appeal Status based on ISO 21001:2018 workflow
export const APPEAL_STATUS = {
  SUBMITTED: 'submitted',                    // Step 1: Letter of appeal submitted
  UNDER_ADMIN_REVIEW: 'under_admin_review', // Step 2: Planning & Quality Officer review
  DOCUMENTED: 'documented',                  // Step 3: Document Control Officer records
  WITH_DEPARTMENT: 'with_department',        // Step 4-5: Concerned head of office
  WITH_PRESIDENT: 'with_president',          // Step 6: School President review
  APPROVED: 'approved',                      // Step 6.2: Approved
  DISAPPROVED: 'disapproved',                // Step 6.3: Disapproved
  COMPLETED: 'completed'                     // Step 10: Presented to appellant
};

// ISO Timeline requirements (in hours)
const ISO_TIMELINES = {
  ADMIN_REVIEW: 1,           // 1 hour - Step 2
  DOCUMENTATION: 1,          // 1 hour - Step 3
  FORWARD_TO_DEPT: 24,       // 1 day - Step 4
  DEPT_REVIEW: 72,           // 3 days - Step 5
  PRESIDENT_REVIEW: 120,     // 5 days - Step 6
  FINAL_PROCESSING: 24       // 1 day - Steps 7-10
};

class AppealService {
  /**
   * Submit a new appeal (Step 1: Process Owner submits letter of appeal)
   * @param {string} reportId - ID of the rejected report
   * @param {string} userId - User ID of the appellant
   * @param {Object} appealData - Appeal details
   * @returns {Object} - Result with success status and appeal ID
   */
  static async submitAppeal(reportId, userId, appealData) {
    try {
      // Verify the report exists and is rejected
      const reportRef = doc(db, 'reports', reportId);
      const reportSnap = await getDoc(reportRef);

      if (!reportSnap.exists()) {
        return { success: false, error: 'Report not found' };
      }

      const reportData = reportSnap.data();

      // Check if report belongs to user
      if (reportData.userId !== userId) {
        return { success: false, error: 'You can only appeal your own reports' };
      }

      // Check if report is rejected
      if (reportData.status !== 'rejected') {
        return { success: false, error: 'Only rejected reports can be appealed' };
      }

      // Check if already appealed
      if (reportData.appealStatus && reportData.appealStatus !== 'denied') {
        return { success: false, error: 'This report has already been appealed' };
      }

      // Calculate deadline (10 days from submission as per ISO process)
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 10);

      // Create appeal document
      const appeal = {
        reportId: reportId,
        userId: userId,
        userName: appealData.userName || 'Unknown',
        userEmail: appealData.userEmail || '',
        reportTitle: reportData.title || 'Untitled Report',
        
        // Appeal details
        reason: appealData.reason || '',
        additionalEvidence: appealData.evidence || [],
        
        // ISO Status tracking
        status: APPEAL_STATUS.SUBMITTED,
        currentStage: 1,
        totalStages: 10,
        
        // Timeline tracking per ISO
        submittedAt: serverTimestamp(),
        deadline: deadline,
        
        // Stage timestamps
        stages: {
          step1_submitted: new Date(),
          step2_adminReview: null,
          step3_documented: null,
          step4_forwardedToDept: null,
          step5_deptReview: null,
          step6_presidentDecision: null,
          step7_processed: null,
          step10_completed: null
        },
        
        // Assigned reviewers (ISO roles)
        assignedAdmin: null,           // Planning & Quality Management Officer
        assignedDeptHead: null,        // Concerned head of office
        assignedPresident: null,       // School President
        
        // Decisions at each stage
        adminNotes: '',
        deptProposal: '',
        presidentDecision: '',
        finalDecision: '',
        
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Add to appeals collection
      const appealRef = await addDoc(collection(db, 'appeals'), appeal);

      // Update report with appeal status
      await updateDoc(reportRef, {
        canAppeal: false,
        appealStatus: APPEAL_STATUS.SUBMITTED,
        appealId: appealRef.id,
        appealedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Send notification to user
      await createNotification(
        userId,
        'Appeal Submitted Successfully',
        `Your appeal for "${reportData.title}" has been submitted and will be reviewed according to ISO 21001:2018 standards.`,
        { type: 'appeal_submitted', appealId: appealRef.id, reportId }
      );

      // Notify admins about new appeal
      const adminsQuery = query(collection(db, 'users'), where('role', 'in', ['admin', 'super_admin']));
      const adminsSnap = await getDocs(adminsQuery);
      for (const adminDoc of adminsSnap.docs) {
        await createNotification(
          adminDoc.id,
          'New ISO Appeal Submitted',
          `${appealData.userName} submitted an appeal for "${reportData.title}". Please review within 1 hour.`,
          { type: 'new_appeal', appealId: appealRef.id, reportId }
        );
      }

      console.log('Appeal submitted successfully:', appealRef.id);
      return { success: true, appealId: appealRef.id };

    } catch (error) {
      console.error('Error submitting appeal:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Step 2: Admin/Planning Officer reviews the appeal (1 hour deadline)
   */
  static async adminReviewAppeal(appealId, adminId, action, notes) {
    try {
      const appealRef = doc(db, 'appeals', appealId);
      const appealSnap = await getDoc(appealRef);

      if (!appealSnap.exists()) {
        return { success: false, error: 'Appeal not found' };
      }

      const updates = {
        status: APPEAL_STATUS.UNDER_ADMIN_REVIEW,
        currentStage: 2,
        assignedAdmin: adminId,
        adminNotes: notes || '',
        'stages.step2_adminReview': new Date(),
        updatedAt: serverTimestamp()
      };

      await updateDoc(appealRef, updates);

      // Auto-move to step 3 (documentation) after admin review
      if (action === 'forward') {
        await this.documentAppeal(appealId, adminId);
      }

      return { success: true };

    } catch (error) {
      console.error('Error in admin review:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Step 3: Document Control Officer records the appeal (1 hour deadline)
   */
  static async documentAppeal(appealId, officerId) {
    try {
      const appealRef = doc(db, 'appeals', appealId);

      const updates = {
        status: APPEAL_STATUS.DOCUMENTED,
        currentStage: 3,
        'stages.step3_documented': new Date(),
        documentedBy: officerId,
        updatedAt: serverTimestamp()
      };

      await updateDoc(appealRef, updates);

      // Auto-forward to department (Step 4)
      await this.forwardToDepartment(appealId);

      return { success: true };

    } catch (error) {
      console.error('Error documenting appeal:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Step 4: Forward to concerned head of office (1 day deadline)
   */
  static async forwardToDepartment(appealId) {
    try {
      const appealRef = doc(db, 'appeals', appealId);
      const appealSnap = await getDoc(appealRef);
      const appealData = appealSnap.data();

      const updates = {
        status: APPEAL_STATUS.WITH_DEPARTMENT,
        currentStage: 4,
        'stages.step4_forwardedToDept': new Date(),
        updatedAt: serverTimestamp()
      };

      await updateDoc(appealRef, updates);
      
      // Notify department heads
      const deptQuery = query(collection(db, 'users'), where('role', '==', 'department_head'));
      const deptSnap = await getDocs(deptQuery);
      for (const deptDoc of deptSnap.docs) {
        await createNotification(
          deptDoc.id,
          'Appeal Forwarded to Department',
          `An appeal for "${appealData.reportTitle}" has been forwarded to your department. Review deadline: 3 days.`,
          { type: 'appeal_department', appealId, reportId: appealData.reportId }
        );
      }
      
      return { success: true };

    } catch (error) {
      console.error('Error forwarding to department:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Step 5: Department head reviews and proposes course of action (3 days deadline)
   */
  static async departmentReview(appealId, deptHeadId, proposal) {
    try {
      const appealRef = doc(db, 'appeals', appealId);
      const appealSnap = await getDoc(appealRef);

      if (!appealSnap.exists()) {
        return { success: false, error: 'Appeal not found' };
      }

      const updates = {
        currentStage: 5,
        assignedDeptHead: deptHeadId,
        deptProposal: proposal,
        'stages.step5_deptReview': new Date(),
        updatedAt: serverTimestamp()
      };

      await updateDoc(appealRef, updates);

      // Auto-forward to President (Step 6)
      await this.forwardToPresident(appealId);

      return { success: true };

    } catch (error) {
      console.error('Error in department review:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Step 6: Forward to School President
   */
  static async forwardToPresident(appealId) {
    try {
      const appealRef = doc(db, 'appeals', appealId);

      const updates = {
        status: APPEAL_STATUS.WITH_PRESIDENT,
        currentStage: 6,
        updatedAt: serverTimestamp()
      };

      await updateDoc(appealRef, updates);
      return { success: true };

    } catch (error) {
      console.error('Error forwarding to president:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Step 6: President approves or disapproves (5 days deadline)
   * This is the FINAL DECISION as per ISO
   */
  static async presidentDecision(appealId, presidentId, decision, reasoning) {
    try {
      const appealRef = doc(db, 'appeals', appealId);
      const appealSnap = await getDoc(appealRef);

      if (!appealSnap.exists()) {
        return { success: false, error: 'Appeal not found' };
      }

      const appealData = appealSnap.data();
      const isApproved = decision === 'approve';

      const updates = {
        status: isApproved ? APPEAL_STATUS.APPROVED : APPEAL_STATUS.DISAPPROVED,
        currentStage: 6,
        assignedPresident: presidentId,
        presidentDecision: decision,
        finalDecision: reasoning,
        'stages.step6_presidentDecision': new Date(),
        updatedAt: serverTimestamp()
      };

      await updateDoc(appealRef, updates);

      // Update the original report status if approved
      if (isApproved) {
        const reportRef = doc(db, 'reports', appealData.reportId);
        await updateDoc(reportRef, {
          status: 'pending', // Re-open the report
          appealStatus: APPEAL_STATUS.APPROVED,
          restoredByAppeal: true,
          restoredAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        // Notify user of approval
        await createNotification(
          appealData.userId,
          'Appeal Approved!',
          `Your appeal for "${appealData.reportTitle}" has been APPROVED by the President. Your report has been restored.`,
          { type: 'appeal_approved', appealId, reportId: appealData.reportId }
        );
      } else {
        // If disapproved, update report appeal status
        const reportRef = doc(db, 'reports', appealData.reportId);
        await updateDoc(reportRef, {
          appealStatus: APPEAL_STATUS.DISAPPROVED,
          updatedAt: serverTimestamp()
        });
        
        // Notify user of disapproval
        await createNotification(
          appealData.userId,
          'Appeal Disapproved',
          `Your appeal for "${appealData.reportTitle}" has been reviewed and disapproved. Reason: ${reasoning}`,
          { type: 'appeal_disapproved', appealId, reportId: appealData.reportId }
        );
      }

      // Auto-process completion (Steps 7-10)
      await this.completeAppeal(appealId);

      return { success: true, decision: isApproved ? 'approved' : 'disapproved' };

    } catch (error) {
      console.error('Error in president decision:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Steps 7-10: Process completion and notify appellant
   */
  static async completeAppeal(appealId) {
    try {
      const appealRef = doc(db, 'appeals', appealId);

      const updates = {
        status: APPEAL_STATUS.COMPLETED,
        currentStage: 10,
        'stages.step7_processed': new Date(),
        'stages.step10_completed': new Date(),
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await updateDoc(appealRef, updates);
      return { success: true };

    } catch (error) {
      console.error('Error completing appeal:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get appeal by ID
   */
  static async getAppealById(appealId) {
    try {
      const appealRef = doc(db, 'appeals', appealId);
      const appealSnap = await getDoc(appealRef);

      if (!appealSnap.exists()) {
        return { success: false, error: 'Appeal not found' };
      }

      const appealData = appealSnap.data();
      return {
        success: true,
        appeal: {
          id: appealSnap.id,
          ...appealData,
          submittedAt: appealData.submittedAt?.toDate?.() || new Date(),
          updatedAt: appealData.updatedAt?.toDate?.() || new Date()
        }
      };

    } catch (error) {
      console.error('Error getting appeal:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's appeals
   */
  static async getUserAppeals(userId) {
    try {
      const q = query(
        collection(db, 'appeals'),
        where('userId', '==', userId),
        orderBy('submittedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const appeals = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        submittedAt: doc.data().submittedAt?.toDate?.() || new Date()
      }));

      return { success: true, appeals };

    } catch (error) {
      console.error('Error getting user appeals:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Subscribe to appeals (for admin panel)
   */
  static subscribeToAppeals(statusFilter, callback) {
    try {
      let q;
      if (statusFilter && statusFilter !== 'all') {
        q = query(
          collection(db, 'appeals'),
          where('status', '==', statusFilter),
          orderBy('submittedAt', 'desc')
        );
      } else {
        q = query(
          collection(db, 'appeals'),
          orderBy('submittedAt', 'desc')
        );
      }

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const appeals = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          callback(appeals);
        },
        (error) => {
          console.error('Error in appeals subscription:', error);
          callback([]);
        }
      );

      return unsubscribe;

    } catch (error) {
      console.error('Error setting up appeals subscription:', error);
      callback([]);
      return null;
    }
  }

  /**
   * Check if appeal deadline is approaching
   */
  static isDeadlineApproaching(appeal) {
    if (!appeal.deadline) return false;

    const now = new Date();
    const deadline = appeal.deadline instanceof Date ? 
      appeal.deadline : 
      new Date(appeal.deadline);
    
    const hoursRemaining = (deadline - now) / (1000 * 60 * 60);
    
    return hoursRemaining < 24 && hoursRemaining > 0;
  }

  /**
   * Check if appeal is overdue
   */
  static isOverdue(appeal) {
    if (!appeal.deadline) return false;

    const now = new Date();
    const deadline = appeal.deadline instanceof Date ? 
      appeal.deadline : 
      new Date(appeal.deadline);
    
    return now > deadline;
  }

  /**
   * Calculate time remaining for current stage
   */
  static getStageTimeRemaining(appeal) {
    const stage = appeal.currentStage;
    const stageTimestamp = this.getStageTimestamp(appeal, stage);
    
    if (!stageTimestamp) return null;

    const stageDeadlineHours = this.getStageDeadline(stage);
    const deadline = new Date(stageTimestamp);
    deadline.setHours(deadline.getHours() + stageDeadlineHours);

    const now = new Date();
    const hoursRemaining = (deadline - now) / (1000 * 60 * 60);

    return {
      deadline: deadline,
      hoursRemaining: Math.max(0, hoursRemaining),
      isOverdue: hoursRemaining < 0
    };
  }

  /**
   * Get timestamp for specific stage
   */
  static getStageTimestamp(appeal, stage) {
    const stageMap = {
      1: appeal.stages?.step1_submitted,
      2: appeal.stages?.step2_adminReview,
      3: appeal.stages?.step3_documented,
      4: appeal.stages?.step4_forwardedToDept,
      5: appeal.stages?.step5_deptReview,
      6: appeal.stages?.step6_presidentDecision,
      10: appeal.stages?.step10_completed
    };

    return stageMap[stage];
  }

  /**
   * Get deadline hours for specific stage
   */
  static getStageDeadline(stage) {
    const deadlines = {
      2: ISO_TIMELINES.ADMIN_REVIEW,
      3: ISO_TIMELINES.DOCUMENTATION,
      4: ISO_TIMELINES.FORWARD_TO_DEPT,
      5: ISO_TIMELINES.DEPT_REVIEW,
      6: ISO_TIMELINES.PRESIDENT_REVIEW,
      10: ISO_TIMELINES.FINAL_PROCESSING
    };

    return deadlines[stage] || 24;
  }
}

export default AppealService;
export { ISO_TIMELINES };
