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

// ==========================================
// WEBHOOKS HANDLING
// These functions are called by external services, e.g. Telegram Bot
// ==========================================

/**
 * Handles incoming POST requests from webhooks
 * @param {object} e - The event object containing the POST request data.
 * @returns {ContentService.TextOutput} - An empty response to acknowledge receipt
 */
function doPost(e) {
  try {
    const postDataJson = JSON.parse(e.postData.contents);
    Utils.logInfo(`Received JSON data: ${JSON.stringify(postDataJson)}`);
  } catch (error) {
    Utils.logError(`Error parsing post data contents. Raw received data: ${e.postData.contents}`, error);
  }

  return ContentService.createTextOutput('');
}

// =====================
// AUXILIARY ENTRY POINTS
// These functions are called manually by developers
// =====================

function clearAllPollProperties() {
  return getPlanner().clearAllPollProperties();
}