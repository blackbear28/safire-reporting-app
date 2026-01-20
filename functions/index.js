/**
 * Main Cloud Functions entry point
 */

const deleteUserFunctions = require('./deleteUser');
const moderation = require('./moderationAnalyze');

// Export all functions
exports.deleteUserAuth = deleteUserFunctions.deleteUserAuth;
exports.deleteUserCompletely = deleteUserFunctions.deleteUserCompletely;
exports.moderationAnalyze = moderation.moderationAnalyze;
