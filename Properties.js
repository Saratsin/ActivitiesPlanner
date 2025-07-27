
// --- Properties Service Key Prefix ---
const POLL_PROPERTY_PREFIX = 'POLL_';

const cachedProperties = {}

function getProperty(key) {
  if (!cachedProperties.hasOwnProperty(key)) {
    cachedProperties[key] = PropertiesService.getScriptProperties().getProperty(key);
  }
  return cachedProperties[key];
}

function getTargetGroupChatId() {
  return getProperty("TARGET_GROUP_CHAT_ID");
}

function getTelegramBotToken() {
  return getProperty("TELEGRAM_BOT_TOKEN");
}

function getTargetCalendarId() {
  return getProperty("TARGET_CALENDAR_ID");
}

function getSourceCalendarId() {
  if (IS_QA_TESTING) {
    return getProperty("QA_SOURCE_CALENDAR_ID");
  }

  return getProperty("SOURCE_CALENDAR_ID");
}