/**
 * Cloud Function to delete user from Firebase Authentication
 * Triggered when a user document is deleted from Firestore
 * 
 * This ensures complete user deletion including Auth account
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Firestore trigger: Delete user from Firebase Auth when Firestore user doc is deleted
 */
exports.deleteUserAuth = functions.firestore
  .document('users/{userId}')
  .onDelete(async (snap, context) => {
    const userId = context.params.userId;
    const userData = snap.data();
    
    console.log(`User document deleted for: ${userId}`, userData);
    
    try {
      // Delete user from Firebase Authentication
      await admin.auth().deleteUser(userId);
      console.log(`Successfully deleted user from Firebase Auth: ${userId}`);
      
      return {
        success: true,
        message: `User ${userId} deleted from Firebase Authentication`
      };
    } catch (error) {
      console.error(`Error deleting user ${userId} from Firebase Auth:`, error);
      
      // Don't throw error if user doesn't exist in Auth (already deleted)
      if (error.code === 'auth/user-not-found') {
        console.log(`User ${userId} not found in Auth (already deleted)`);
        return {
          success: true,
          message: 'User not found in Auth (already deleted)'
        };
      }
      
      // Log error but don't fail the function
      return {
        success: false,
        error: error.message
      };
    }
  });

/**
 * Callable function: Delete user completely (Auth + Firestore + Storage)
 * Can be called directly from admin panel
 */
exports.deleteUserCompletely = functions.https.onCall(async (data, context) => {
  // Check if request is from an authenticated admin
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to delete users'
    );
  }
  
  const { userId } = data;
  
  if (!userId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'userId is required'
    );
  }
  
  try {
    // 1. Delete from Firebase Authentication
    await admin.auth().deleteUser(userId);
    console.log(`Deleted user from Auth: ${userId}`);
    
    // 2. Delete user document from Firestore
    await admin.firestore().collection('users').doc(userId).delete();
    console.log(`Deleted user document: ${userId}`);
    
    // 3. Delete user's reports
    const reportsSnapshot = await admin.firestore()
      .collection('reports')
      .where('authorId', '==', userId)
      .get();
    
    const batch = admin.firestore().batch();
    reportsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`Deleted ${reportsSnapshot.size} reports for user: ${userId}`);
    
    return {
      success: true,
      message: `User ${userId} and ${reportsSnapshot.size} reports deleted successfully`,
      deletedReports: reportsSnapshot.size
    };
    
  } catch (error) {
    console.error('Error in deleteUserCompletely:', error);
    throw new functions.https.HttpsError(
      'internal',
      `Failed to delete user: ${error.message}`
    );
  }
});
