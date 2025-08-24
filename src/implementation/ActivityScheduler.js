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
    this.checkPollResults();
    this.sendVotingPoll();
    Utils.logInfo("Poll sync completed.");
  }

  checkPollResults() {
    const pollProperties = this.pollManager.getAllPollProperties();
    this.pollResultsProcessor.processDuePolls(pollProperties);
  }

  sendVotingPoll() {
    const now = new Date();

    Utils.logInfo(`Running sendVotingPoll for ${now}.`);

    const nextGroupEventData = this.calendarManager.getNextGroupEventData(now);
    if (!nextGroupEventData || 
        nextGroupEventData.pollCreationDateTime > now || 
        nextGroupEventData.pollVotesCountingDateTime < now) {
      Utils.logInfo(`No valid voting activity that should be started at ${now}.`);
      return;
    }

    // Sends and stores poll for next group event data
    const result = this.pollManager.trySendAndStorePoll(nextGroupEventData);
    
    if (result.success) {
      Utils.logInfo("Poll sent successfully.");
      return;
    }
    
    if (result.reason === 'already_exists') {
      Utils.logInfo("Finished sendVotingPoll (found existing poll).");
      return;
    }
    
    Utils.logError('Poll sending workflow', `Failed to send poll for ${activity}.`);
  }

  clearAllPollProperties() {
    return this.pollManager.clearAllPollProperties();
  }
}