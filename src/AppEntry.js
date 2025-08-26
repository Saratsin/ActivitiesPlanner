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

function setupTelegramWebhook() {
  return getPlanner().setupTelegramWebhook();
}

function testLogger(){
  Logger = BetterLog.useSpreadsheet('11D0qCnpn2U7KsP5pr_aXU-B7lJU09aCnNABW2yK7tX4'); 
  Logger.log(`Test log`);
}

/**
 * Handles incoming POST requests from webhooks
 * @param {object} e - The event object containing the POST request data.
 * @returns {ContentService.TextOutput} - An empty response to acknowledge receipt
 */
function doPost(e) {
  try {
    // Performance issue
    //Logger = BetterLog.useSpreadsheet('11D0qCnpn2U7KsP5pr_aXU-B7lJU09aCnNABW2yK7tX4'); 

    var planner = getPlanner();
    var apiKey = planner.getWebhookApiKey();
    if (e?.parameter?.apiKey !== apiKey) {
      throw new Error(`Invalid API key ${e?.parameter?.apiKey}`);
    }

    const postDataJson = JSON.parse(e.postData.contents);
    Logger.log(`Received JSON data: ${JSON.stringify(postDataJson)}`);

    planner.handleIncomingWebhook(postDataJson);

    return ContentService.createTextOutput('Ok').setMimeType(ContentService.MimeType.text);
  } catch (error) {
    Logger.log(`Error parsing post data contents. Raw received data: ${e?.postData?.contents}`, error);

    // TODO not secure to show error messages
    return ContentService.createTextOutput(`Oops: ${error.message}`).setMimeType(ContentService.MimeType.text);
  }
}

// Only for testing
function pullPrivateChatUpdates() {
  return getPlanner().pullUpdates();
}


// Only for testing
function testPullPrivateChatUpdates() {
  while (true) {
    const result = getPlanner().pullUpdates(5);

  }
}

// =====================
// AUXILIARY ENTRY POINTS
// These functions are called manually by developers
// =====================

function clearAllPollProperties() {
  return getPlanner().clearAllPollProperties();
}