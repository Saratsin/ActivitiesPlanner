class ActivityScheduler {
  constructor(configManager, telegramBot, calendarManager) {
    this.configManager = configManager;
    this.telegramBot = telegramBot;
    this.calendarManager = calendarManager;
    this.pollManager = new PollManager(configManager, telegramBot);
    this.pollResultsProcessor = new PollResultsProcessor(configManager, telegramBot, calendarManager);
  }

  syncPolls() {
    Utils.logInfo("Starting poll sync: checking results and sending voting poll.");
    const processedCount = this.checkPollResults();
    const sendResult = this.sendVotingPoll();
    Utils.logInfo("Poll sync completed.");
    return { processedCount, sendResult };
  }

  checkPollResults() {
    const pollProperties = this.pollManager.getAllPollProperties();
    return this.pollResultsProcessor.processDuePolls(pollProperties);
  }

  sendVotingPoll() {
    const today = new Date();
    //today.setHours(0, 0, 0, 0);
    //today.setTime(today.getTime() + 6 * 24 * 60 * 60 * 1000);

    Utils.logInfo(`Running sendVotingPoll for ${today}.`);

    const nextGroupEventData = this.calendarManager.getNextGroupEventData(today);
    if (!nextGroupEventData || today > nextGroupEventData.pollVotesCountingDateTime) {
      Utils.logInfo(`No valid voting activity for that should be started at ${today}.`);
      return false;
    }

    // Sends and stores poll for next group event data
    const result = this.pollManager.sendAndStorePoll(nextGroupEventData);
    
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

  clearAllPollProperties() {
    return this.pollManager.clearAllPollProperties();
  }
}