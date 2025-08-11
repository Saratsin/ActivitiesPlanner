class PollResultsProcessor {
  constructor(configManager, telegramBot, calendarManager) {
    this.configManager = configManager;
    this.telegramBot = telegramBot;
    this.calendarManager = calendarManager;
  }
  
  processDuePolls(pollProperties) {
    const now = new Date();
    let processedCount = 0;

    Utils.logInfo(`Running checkPollResults at ${now.toISOString()}. Checking ${Object.keys(pollProperties).length} potential poll properties.`);

    for (const [pollMessageId, groupEventData] of Object.entries(pollProperties)) {
      // Validate poll data
      if (!groupEventData.isValid()) {
        Utils.logInfo(`Incomplete data found in property ${CONFIG_POLL_PROPERTY_PREFIX}${pollMessageId}. Deleting. Data: ${JSON.stringify(groupEventData)}`);
        this.deletePollProperty(pollMessageId);
        continue;
      }

      const checkDateTime = groupEventData.pollVotesCountingDateTime;

      // Check if it's time to process this poll
      if (now < checkDateTime) {
        continue;
      }

      Utils.logInfo(`Processing due poll for ${groupEventData.getActivityName()} on ${groupEventData.startDateTime} (Msg ID: ${pollMessageId}, Check Time: ${checkDateTime})`);

      try {
        const groupChatId = this.configManager.getTargetGroupChatId();

        // Stop the poll in order to get its results
        const pollResults = this.telegramBot.stopPoll(groupChatId, pollMessageId);
        if (!pollResults || !pollResults.options) {
          throw new Error(`Failed to stop or get results for poll ${pollMessageId}. It might have been stopped manually, deleted, or API error occurred.`);
        }

        const processedResults = this.processPollResults(pollResults.options, groupEventData);
        const resultsMessage = processedResults.bookingConfirmed
          ? this.configManager.getMessage('bookingSecured')(processedResults.votesFor, groupEventData.getActivityName(), groupEventData.getStartDateTimeString())
          : this.configManager.getMessage('bookingCancelled')(processedResults.votesFor, groupEventData.getActivityName(), groupEventData.getStartDateTimeString());

        if (!processedResults.bookingConfirmed) {
          this.calendarManager.deleteEventById(groupEventData.id);
        }

        this.telegramBot.sendMessage(groupChatId, resultsMessage, pollMessageId);
        this.telegramBot.unpinMessage(groupChatId, pollMessageId);
        
        // Remove the property after successful processing
        this.deletePollProperty(pollMessageId);
        processedCount++;

      } catch (error) {
        Utils.logError(`Poll processing (${pollMessageId})`, error);
        // Remove the property to avoid infinite retries
        this.deletePollProperty(pollMessageId);
      }
    }

    if (processedCount === 0) {
      Utils.logInfo("No polls were due for checking in this run.");
    }

    Utils.logInfo("Finished checkPollResults execution.");
    return processedCount;
  }

  processPollResults(pollResultsOptions, groupEventData) {
    let votesFor = 0;
    for (const option of pollResultsOptions) {
      if (option.text === this.configManager.getMessage('pollOptions')[0]) {
        votesFor = option.voter_count;
        break;
      }
    }

    Utils.logInfo(`Poll results: ${votesFor} voted '${this.configManager.getMessage('pollOptions')[0]}'`);

    const minVotesRequired = groupEventData.minPositiveVotersCount;
    return {
      bookingConfirmed: votesFor >= minVotesRequired,
      votesFor: votesFor
    };
  }

  deletePollProperty(messageId) {
    const key = `${CONFIG_POLL_PROPERTY_PREFIX}${messageId}`;
    PropertiesService.getScriptProperties().deleteProperty(key);
    Utils.logInfo(`Property ${key} removed after processing.`);
  }
}
