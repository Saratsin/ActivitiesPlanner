/**
 * AppEntry - Global entry points and Google Apps Script trigger functions
 * This file contains all the global functions that serve as entry points for
 * Google Apps Script triggers and manual execution.
 */

// Global application instance
let planner = null;

/**
 * Get or create the global application instance
 * @returns {ActivitiesPlanner} Application instance
 */
function getPlanner() {
  if (!planner) {
    planner = new ActivitiesPlanner();
  }
  return planner;
}

// =====================
// MAIN ENTRY POINTS
// These functions are called by Google Apps Script triggers
// =====================

/**
 * Main calendar sync function (called by calendar change trigger)
 */
function syncCalendars() {
  return getPlanner().syncCalendars();
}

/**
 * Main polls sync function (called by time trigger)
 */

function syncPolls() {
  return getPlanner().syncPolls();
}