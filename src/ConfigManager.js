/**
 * ConfigManager - Handles all configuration, properties, and constants
 */
class ConfigManager {
  // Configuration constants
  static IS_QA_TESTING = false;
  static POLL_CREATION_HOUR = 9;
  static POLL_CHECK_HOUR = 17;
  static MIN_VOTES_REQUIRED = 6;
  static MIN_BASKETBALL_VOTES_REQUIRED = 4;
  static DAYS_TO_SYNC = 7;
  static SOURCE_EVENT_ID_KEY = 'sourceEventId';
  static POLL_PROPERTY_PREFIX = 'POLL_';
  static SCRIPT_TIMEZONE = Session.getScriptTimeZone();

  // Voting schedule configuration
  static VOTING_SCHEDULE = {
    0: { activity: 'Баскетбол', activityStartTime: '18:00', checkDelayMinutes: (ConfigManager.POLL_CHECK_HOUR - ConfigManager.POLL_CREATION_HOUR) * 60 - 1 },
    2: { activity: 'Футбол', activityStartTime: '19:00', checkDelayMinutes: (ConfigManager.POLL_CHECK_HOUR - ConfigManager.POLL_CREATION_HOUR) * 60 - 1 },
    3: { activity: 'Баскетбол', activityStartTime: '18:00', checkDelayMinutes: (ConfigManager.POLL_CHECK_HOUR - ConfigManager.POLL_CREATION_HOUR) * 60 - 1 },
    4: { activity: 'Футбол', activityStartTime: '19:00', checkDelayMinutes: (ConfigManager.POLL_CHECK_HOUR - ConfigManager.POLL_CREATION_HOUR) * 60 - 1 },
    5: { activity: 'Баскетбол', activityStartTime: '18:00', checkDelayMinutes: (ConfigManager.POLL_CHECK_HOUR - ConfigManager.POLL_CREATION_HOUR) * 60 - 1 }
  };

  // Message templates
  static MESSAGES = {
    pollQuestion: (activity, activityStartTime, dateStr) => `${activity} ${activityStartTime} (${dateStr})`,
    pollOptions: ['✅', '❌'],
    bookingSecured: (votes, activity, dateStr) => `✅ ${votes} людей проголосувало за. Бронювання для ${activity}у (${dateStr}) залишається в силі 💪\n\nБронювання спортмайданчика: \nhttps://na-sm-booking.shevchuk.it \n\nКалендар з бронюваннями: \nhttps://na-sm-calendar.shevchuk.it`,
    bookingCancelled: (votes, activity, activityStartTime, dateStr) => `❌ Лише ${votes} ${votes === 1 ? 'людина проголосувала' : 'людей проголосувало'} за. Бронювання для ${activity}у (${dateStr}) скасовано, слоти після ${activityStartTime} сьогодні вільні.\n\nБронювання спортмайданчика: \nhttps://na-sm-booking.shevchuk.it \n\nКалендар з бронюваннями: \nhttps://na-sm-calendar.shevchuk.it`,
    infoStateReset: (count) => `ℹ️ Дані по голосуваннях в боті скинуто: Видалено ${count} ${count === 1 ? 'активний запис' : 'активних записів'}.`,
    testMessage: "Усім привіт :)\n\nЯ телеграм-бот який буде допомагати з груповими активностями на спортивному майданчику в НА. Десь між 09 і 10 ранку я запускатиму голосування щодо відповідної активності яка наступна в розкладі (наприклад в середу буде запускатись голосування щодо баскетболу в четвер, в інші дні голосування буде день у день).\n\nПотім в день цієї активності десь між 17:00 та 17:10 я погляну скільки людей проголосувало за. Якщо менше 6, то бронь на активність буде скасована, і слоти стануть доступні для бронювання. Якщо ж 6 і більше людей буде за, то бронь залишатиметься в силі.\n\nСподіваюсь я полегшу вам життя з часом, і переваг від мого існування буде більше ніж недоліків)"
  };

  constructor() {
    this.cachedProperties = {};
  }

  /**
   * Get a property from PropertiesService with caching
   * @param {string} key - Property key
   * @returns {string|null} Property value
   */
  getProperty(key) {
    if (!this.cachedProperties.hasOwnProperty(key)) {
      this.cachedProperties[key] = PropertiesService.getScriptProperties().getProperty(key);
    }
    return this.cachedProperties[key];
  }

  /**
   * Get target group chat ID
   * @returns {string} Chat ID
   */
  getTargetGroupChatId() {
    return this.getProperty("TARGET_GROUP_CHAT_ID");
  }

  /**
   * Get Telegram bot token
   * @returns {string} Bot token
   */
  getTelegramBotToken() {
    return this.getProperty("TELEGRAM_BOT_TOKEN");
  }

  /**
   * Get target calendar ID
   * @returns {string} Calendar ID
   */
  getTargetCalendarId() {
    return this.getProperty("TARGET_CALENDAR_ID");
  }

  /**
   * Get source calendar ID
   * @returns {string} Calendar ID
   */
  getSourceCalendarId() {
    if (ConfigManager.IS_QA_TESTING) {
      return this.getProperty("QA_SOURCE_CALENDAR_ID");
    }
    return this.getProperty("SOURCE_CALENDAR_ID");
  }

  /**
   * Get minimum votes required for an activity
   * @param {string} activity - Activity name
   * @returns {number} Minimum votes required
   */
  getMinVotesRequired(activity) {
    return activity === 'Баскетбол' ? ConfigManager.MIN_BASKETBALL_VOTES_REQUIRED : ConfigManager.MIN_VOTES_REQUIRED;
  }

  /**
   * Get voting schedule entry for a day
   * @param {number} dayOfWeek - Day of week (0-6)
   * @returns {Object|null} Schedule entry
   */
  getScheduleEntry(dayOfWeek) {
    return ConfigManager.VOTING_SCHEDULE[dayOfWeek] || null;
  }
}
