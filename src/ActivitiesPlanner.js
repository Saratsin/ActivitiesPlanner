/**
 * ActivitiesPlanner - Main application class that coordinates all components
 */
class ActivitiesPlanner {
  constructor() {
    this.configManager = new ConfigManager();
    this.telegramBot = new TelegramBot(this.configManager);
    this.calendarManager = new CalendarManager(this.configManager);
    this.activityScheduler = new ActivityScheduler(this.configManager, this.telegramBot, this.calendarManager);
  }

  /**
   * Sync calendars with lock protection
   * @returns {Object} Sync results
   */
  syncCalendars() {
    return Utils.executeWithLock(() => {
      Utils.logInfo("Starting calendar sync process.");
      const result = this.calendarManager.syncCalendars();
      Utils.logInfo("Calendar sync process completed.");
      return result;
    });
  }

  /**
   * Sync polls: check results and send new voting polls with lock protection
   * @returns {Object} { processedCount, sendResult }
   */
  syncPolls() {
    return Utils.executeWithLock(() => {
      Utils.logInfo("Starting poll sync: checking results and sending voting poll.");
      const results = this.activityScheduler.syncPolls();
      Utils.logInfo("Poll sync completed.");
      return results;
    });
  }
}
