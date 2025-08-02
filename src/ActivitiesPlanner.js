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
   * Send voting poll for current day
   * @returns {boolean} Success status
   */
  sendVotingPoll() {
    Utils.logInfo("Starting voting poll creation.");
    const result = this.activityScheduler.sendVotingPoll();
    Utils.logInfo("Finished voting poll creation.");
    return result;
  }

  /**
   * Check poll results for due polls
   * @returns {number} Number of polls processed
   */
  checkPollResults() {
    Utils.logInfo("Starting poll results check.");
    const processedCount = this.activityScheduler.checkPollResults();
    Utils.logInfo("Finished poll results check.");
    return processedCount;
  }

  /**
   * Cancel calendar event for specific activity
   * @param {string} activity - Activity name
   * @param {string} activityDateStr - Date string (dd.MM)
   * @returns {boolean} Success status
   */
  cancelCalendarEventForActivity(activity, activityDateStr) {
    Utils.logInfo(`Attempting to cancel calendar event for ${activity} on ${activityDateStr}.`);
    const result = this.calendarManager.cancelEventForActivity(activity, activityDateStr);
    Utils.logInfo(`Calendar event cancellation ${result ? 'successful' : 'failed'}.`);
    return result;
  }

  /**
   * Send test message
   * @returns {boolean} Success status
   */
  sendTestMessage() {
    Utils.logInfo("Sending test message.");
    return this.telegramBot.sendTestMessage();
  }

  /**
   * Send test voting poll
   * @param {number} testDay - Day of week to test
   * @returns {boolean} Success status
   */
  sendTestVotingPoll(testDay = 3) {
    Utils.logInfo(`Sending test voting poll for day ${testDay}.`);
    return this.activityScheduler.sendTestVotingPoll(testDay);
  }

  /**
   * Clear all poll properties
   * @returns {number} Number of properties cleared
   */
  clearAllPollProperties() {
    Utils.logInfo("Clearing all poll properties.");
    const count = this.activityScheduler.clearAllPollProperties();
    Utils.logInfo(`Cleared ${count} poll properties.`);
    return count;
  }

  /**
   * Get application status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      configManager: {
        targetGroupChatId: !!this.configManager.getTargetGroupChatId(),
        telegramBotToken: !!this.configManager.getTelegramBotToken(),
        sourceCalendarId: !!this.configManager.getSourceCalendarId(),
        targetCalendarId: !!this.configManager.getTargetCalendarId()
      },
      timestamp: new Date().toISOString(),
      timezone: ConfigManager.SCRIPT_TIMEZONE
    };
  }
}
