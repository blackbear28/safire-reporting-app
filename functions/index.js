/**
 * Main Cloud Functions entry point
 */

const deleteUserFunctions = require('./deleteUser');

// Export all functions
exports.deleteUserAuth = deleteUserFunctions.deleteUserAuth;
exports.deleteUserCompletely = deleteUserFunctions.deleteUserCompletely;
