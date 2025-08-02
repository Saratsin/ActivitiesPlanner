/**
 * AppEntry - Global entry points and Google Apps Script trigger functions
 * This file contains all the global functions that serve as entry points for
 * Google Apps Script triggers and manual execution.
 */

// Global application instance
let app = null;

/**
 * Get or create the global application instance
 * @returns {ActivitiesPlanner} Application instance
 */
function getApp() {
  if (!app) {
    app = new ActivitiesPlanner();
  }
  return app;
}

// =====================
// MAIN ENTRY POINTS
// These functions are called by Google Apps Script triggers
// =====================

/**
 * Main calendar sync function (called by trigger)
 */
function syncCalendars() {
  return getApp().syncCalendars();
}

/**
 * Main voting poll creation function (called by trigger)
 */
function sendVotingPoll() {
  return getApp().sendVotingPoll();
}

/**
 * Main poll results checking function (called by trigger)
 */
function checkPollResults() {
  return getApp().checkPollResults();
}

/**
 * Cancel calendar event for activity (called by ActivityScheduler)
 * @param {string} activity - Activity name
 * @param {string} activityDateStr - Date string (dd.MM)
 */
function cancelCalendarEventForActivity(activity, activityDateStr) {
  return getApp().cancelCalendarEventForActivity(activity, activityDateStr);
}

// =====================
// TESTING AND UTILITY FUNCTIONS
// =====================

/**
 * Send test message (manual execution)
 */
function testSendMessage() {
  return getApp().sendTestMessage();
}

/**
 * Send test voting poll (manual execution)
 */
function testSendVotingPollAndStore() {
  return getApp().sendTestVotingPoll();
}

/**
 * Clear all poll properties (manual execution)
 */
function clearAllPollProperties() {
  return getApp().clearAllPollProperties();
}

/**
 * Get application status (manual execution)
 */
function getAppStatus() {
  return getApp().getStatus();
}

// =====================
// LEGACY COMPATIBILITY FUNCTIONS
// These maintain compatibility with existing triggers and calls
// =====================

/**
 * Legacy function for backward compatibility
 * @param {string} activity - Activity name
 * @param {string} activityDateStr - Date string
 */
function cancelCalendarEvent(activity, activityDateStr) {
  return cancelCalendarEventForActivity(activity, activityDateStr);
}

/**
 * Legacy property access functions for backward compatibility
 */
function getTargetGroupChatId() {
  return getApp().configManager.getTargetGroupChatId();
}

function getTelegramBotToken() {
  return getApp().configManager.getTelegramBotToken();
}

function getTargetCalendarId() {
  return getApp().configManager.getTargetCalendarId();
}

function getSourceCalendarId() {
  return getApp().configManager.getSourceCalendarId();
}
