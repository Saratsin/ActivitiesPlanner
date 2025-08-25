class ActivitiesPlanner {
  constructor() {
    this.configManager = new ConfigManager();
    this.telegramBot = new TelegramBot(this.configManager);
    this.calendarManager = new CalendarManager(this.configManager);
    this.activityScheduler = new ActivityScheduler(this.configManager, this.telegramBot, this.calendarManager);
    this.privateChatManager = new PrivateChatManager(this.configManager, this.telegramBot, this.calendarManager);
  }

  syncCalendars() {
    return Utils.executeWithLock(() => {
      Utils.logInfo("Starting calendar sync process.");
      const result = this.calendarManager.syncCalendars();
      Utils.logInfo("Calendar sync process completed.");
      return result;
    });
  }

  syncPolls() {
    return Utils.executeWithLock(() => {
      Utils.logInfo("Starting poll sync: checking results and sending voting poll.");
      this.activityScheduler.syncPolls();
      Utils.logInfo("Poll sync completed.");
    });
  }

  clearAllPollProperties() {
    return this.activityScheduler.clearAllPollProperties();
  }

  setupMenu() {
    return this.privateChatManager.setupMenu();
  }

  pullUpdates() {
    return this.privateChatManager.pollUpdates();
  }
}
