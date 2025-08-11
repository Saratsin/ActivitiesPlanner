let planner = null;

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

// =====================
// AUXILIARY ENTRY POINTS
// These functions are called manually by developers
// =====================

function clearAllPollProperties() {
  return getPlanner().clearAllPollProperties();
}