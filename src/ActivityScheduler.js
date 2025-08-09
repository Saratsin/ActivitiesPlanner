/**
 * ActivityScheduler - Orchestrates poll scheduling and voting logic
 */
class ActivityScheduler {
  constructor(configManager, telegramBot, calendarManager) {
    this.configManager = configManager;
    this.telegramBot = telegramBot;
    this.calendarManager = calendarManager;
    this.pollManager = new PollManager(configManager, telegramBot);
    this.pollResultsProcessor = new PollResultsProcessor(configManager, telegramBot, calendarManager);
  }

  /**
   * Sync polls: check results and send new voting polls
   * @returns {Object} { processedCount, sendResult }
   */
  syncPolls() {
    Utils.logInfo("Starting poll sync: checking results and sending voting poll.");
    const processedCount = checkPollResults();
    const sendResult = sendVotingPoll();
    Utils.logInfo("Poll sync completed.");
    return { processedCount, sendResult };
  }

  /**
   * Check poll results for due polls
   * @returns {number} Number of polls processed
   */
  checkPollResults() {
    const pollProperties = this.pollManager.getAllPollProperties();
    return this.pollResultsProcessor.processDuePolls(pollProperties);
  }
  
  /**
   * Send voting poll for current day and time
   * @returns {boolean} Success status
   */
  sendVotingPoll() {
    const today = new Date();
    const currentDayOfWeek = today.getDay();
    const scheduleEntry = this.configManager.getVotingScheduleEntry(currentDayOfWeek);

    Utils.logInfo(`Running sendVotingPoll for day ${currentDayOfWeek}.`);

    if (!scheduleEntry || !scheduleEntry.activity || !scheduleEntry.checkDelayMinutes) {
      Utils.logInfo(`No valid voting activity or delay configured for today (Day ${currentDayOfWeek}).`);
      return false;
    }

    const { activity, checkDelayMinutes } = scheduleEntry;
    const activityStartTime = scheduleEntry.activityStartTime || '18:00';
    Utils.logInfo(`Today is scheduled for voting for: ${activity} with check delay: ${checkDelayMinutes} minutes.`);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const pollDateStr = this.pollManager.formatDateString(tomorrow);

    // Calculate check time
    const checkDateTime = new Date(today.getTime() + checkDelayMinutes * 60 * 1000);

    // Send and store poll
    const result = this.pollManager.sendAndStorePoll(activity, activityStartTime, pollDateStr, checkDateTime);
    
    if (result.success) {
      Utils.logInfo("Finished sendVotingPoll (poll sent successfully).");
      return true;
    } else {
      if (result.reason === 'already_exists') {
        Utils.logInfo("Finished sendVotingPoll (found existing poll).");
        return true;
      } else {
        Utils.logError('Poll sending workflow', `Failed to send poll for ${activity}.`);
        return false;
      }
    }
  }

  /**
   * Clear all poll properties
   * @returns {number} Number of properties cleared
   */
  clearAllPollProperties() {
    return this.pollManager.clearAllPollProperties();
  }

  /**
   * Send test voting poll
   * @param {number} testDay - Day of week to test
   * @returns {boolean} Success status
   */
  sendTestVotingPoll(testDay = 3) {
    const scheduleEntry = this.configManager.getVotingScheduleEntry(testDay);

    if (!scheduleEntry || !scheduleEntry.activity || !scheduleEntry.checkDelayMinutes) {
      Utils.logError('Test poll setup', `No valid schedule entry defined for test day ${testDay} in VOTING_SCHEDULE. Aborting test.`);
      return false;
    }

    const { activity, checkDelayMinutes } = scheduleEntry;
    const activityStartTime = scheduleEntry.activityStartTime || '18:00';

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const pollDateStr = this.pollManager.formatDateString(tomorrow);

    // Send the poll
    const result = this.pollManager.sendAndStorePoll(activity, activityStartTime, pollDateStr, new Date(today.getTime() + checkDelayMinutes * 60 * 1000));

    if (result.success) {
      Utils.logInfo(`Test poll sent. Message ID: ${result.messageId}`);

      // Try to pin the message
      const pinned = this.telegramBot.pinMessage(result.messageId);
      if (pinned) {
        Utils.logInfo(`Poll message ${result.messageId} pinned successfully.`);
      } else {
        Utils.logInfo(`Failed to pin poll message ${result.messageId}. Check bot permissions.`);
      }

      // For testing, set a very short check time (2 minutes from now)
      const testCheckDateTime = new Date(Date.now() + 2 * 60 * 1000);
      Utils.logInfo(`Setting check time for immediate testing to: ${testCheckDateTime.toISOString()}`);

      // Update the stored poll data with the test check time
      const updatedPollData = {
        ...result.pollData,
        checkDateTimeISO: testCheckDateTime.toISOString()
      };
      this.pollManager.storePollData(result.messageId, updatedPollData);

      return true;
    } else {
      Utils.logError('Test poll sending', "Failed to send test poll.");
      return false;
    }
  }
}