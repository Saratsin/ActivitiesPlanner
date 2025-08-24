const CONFIG_IS_QA_TESTING = false;
const CONFIG_DAYS_TO_SYNC = 8;
const CONFIG_SOURCE_EVENT_ID_KEY = 'sourceEventId';
const CONFIG_POLL_PROPERTY_PREFIX = 'POLL_';
const CONFIG_SCRIPT_TIMEZONE = Session.getScriptTimeZone();

const CONFIG_MESSAGES = {
  pollOptions: ['✅', '❌'],
  bookingSecured: (votes, activity, dateStr) => `✅ ${votes} людей проголосувало за. Бронювання для ${activity}у (${dateStr}) залишається в силі 💪\n\nБронювання спортмайданчика: \nhttps://na-sm-booking.shevchuk.it \n\nКалендар з бронюваннями: \nhttps://na-sm-calendar.shevchuk.it`,
  bookingCancelled: (votes, activity, dateStr) => `❌ Лише ${votes} ${votes === 1 ? 'людина проголосувала' : 'людей проголосувало'} за. Бронювання для ${activity}у скасовано, слоти після ${dateStr} вільні.\n\nБронювання спортмайданчика: \nhttps://na-sm-booking.shevchuk.it \n\nКалендар з бронюваннями: \nhttps://na-sm-calendar.shevchuk.it`
};

class ConfigManager {
  constructor() {
    this.cachedProperties = {};
  }

  getProperty(key) {
    if (!this.cachedProperties.hasOwnProperty(key)) {
      this.cachedProperties[key] = PropertiesService.getScriptProperties().getProperty(key);
    }
    return this.cachedProperties[key];
  }

  getBookingsCalendarId() {
    return this.getProperty(CONFIG_IS_QA_TESTING ? "QA_TARGET_CALENDAR_ID" : "TARGET_CALENDAR_ID");
  }

  getTargetGroupChatId() {
    return this.getProperty(CONFIG_IS_QA_TESTING ? "QA_TARGET_GROUP_CHAT_ID" : "TARGET_GROUP_CHAT_ID");
  }

  getTelegramBotToken() {
    return this.getProperty("TELEGRAM_BOT_TOKEN");
  }

  getMessage(messageType) {
    return CONFIG_MESSAGES[messageType];
  }

  // TODO Remove it when the migration to telegram bot will be completed

  getSourceCalendarId() {
    return this.getProperty(CONFIG_IS_QA_TESTING ? "QA_SOURCE_CALENDAR_ID" : "SOURCE_CALENDAR_ID");
  }
}
