const CONFIG_IS_QA_TESTING = false;
const CONFIG_DAYS_TO_SYNC = 10;
const CONFIG_SOURCE_EVENT_ID_KEY = 'sourceEventId';
const CONFIG_POLL_PROPERTY_PREFIX = 'POLL_';
const CONFIG_SCRIPT_TIMEZONE = Session.getScriptTimeZone();

const CONFIG_MESSAGES = {
  pollOptions: ['✅', '❌'],
  bookingSecured: (votes, activity, dateStr) => `✅ ${votes} людей проголосувало за. Бронювання для ${activity}у (${dateStr}) залишається в силі 💪\n\nБронювання спортмайданчика: \nhttps://na-sm-booking.shevchuk.it \n\nКалендар з бронюваннями: \nhttps://na-sm-calendar.shevchuk.it`,
  bookingCancelled: (votes, activity, dateStr) => `❌ Лише ${votes} ${votes === 1 ? 'людина проголосувала' : 'людей проголосувало'} за. Бронювання для ${activity}у скасовано, слоти після ${dateStr} сьогодні вільні.\n\nБронювання спортмайданчика: \nhttps://na-sm-booking.shevchuk.it \n\nКалендар з бронюваннями: \nhttps://na-sm-calendar.shevchuk.it`,
  infoStateReset: (count) => `ℹ️ Дані по голосуваннях в боті скинуто: Видалено ${count} ${count === 1 ? 'активний запис' : 'активних записів'}.`,
  testMessage: "Усім привіт :)\n\nЯ телеграм-бот який буде допомагати з груповими активностями на спортивному майданчику в НА. Десь між 09 і 10 ранку я запускатиму голосування щодо відповідної активності яка наступна в розкладі (наприклад в середу буде запускатись голосування щодо баскетболу в четвер, в інші дні голосування буде день у день).\n\nПотім в день цієї активності десь між 17:00 та 17:10 я погляну скільки людей проголосувало за. Якщо менше 6, то бронь на активність буде скасована, і слоти стануть доступні для бронювання. Якщо ж 6 і більше людей буде за, то бронь залишатиметься в силі.\n\nСподіваюсь я полегшу вам життя з часом, і переваг від мого існування буде більше ніж недоліків)"
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
