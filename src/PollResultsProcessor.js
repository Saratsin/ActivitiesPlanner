/**
 * PollResultsProcessor - Handles poll results processing and calendar event management
 */
class PollResultsProcessor {
  constructor(configManager, telegramBot, calendarManager) {
    this.configManager = configManager;
    this.telegramBot = telegramBot;
    this.calendarManager = calendarManager;
  }

  /**
   * Process poll results and handle calendar events accordingly
   * @param {Object} pollResults - Poll results from Telegram API
   * @param {Object} pollData - Stored poll data
   * @returns {Object} Processing result with vote counts and action taken
   */
  processPollResults(pollResults, pollData) {
    const { activity, activityStartTime, pollDateStr } = pollData;
    
    let votesFor = 0;
    for (const option of pollResults.options) {
      if (option.text === ConfigManager.MESSAGES.pollOptions[0]) {
        votesFor = option.voter_count;
        break;
      }
    }

    Utils.logInfo(`Poll results: ${votesFor} voted '${ConfigManager.MESSAGES.pollOptions[0]}'`);

    const minVotesRequired = this.configManager.getMinVotesRequired();
    let actionTaken = null;

    if (votesFor >= minVotesRequired) {
      // Confirm the booking
      Utils.logInfo(`Booking CONFIRMED for ${activity}`);
      actionTaken = 'confirmed';
    } else {
      // Cancel the booking
      Utils.logInfo(`Booking CANCELLED for ${activity}`);
      
      // Try to cancel the calendar event
      try {
        this.calendarManager.cancelEventForActivity(activity, pollDateStr);
        actionTaken = 'cancelled';
      } catch (error) {
        Utils.logError(`Calendar cancellation for ${activity} on ${pollDateStr}`, error);
        actionTaken = 'cancel_failed';
      }
    }

    return {
      votesFor: votesFor,
      minVotesRequired: minVotesRequired,
      actionTaken: actionTaken,
      activity: activity,
      activityStartTime: activityStartTime,
      pollDateStr: pollDateStr
    };
  }

  /**
   * Process due polls and handle their results
   * @param {Object} pollProperties - Poll properties from PollManager
   * @returns {number} Number of polls processed
   */
  processDuePolls(pollProperties) {
    const now = new Date();
    let processedCount = 0;

    Utils.logInfo(`Running checkPollResults at ${now.toISOString()}. Checking ${Object.keys(pollProperties).length} potential poll properties.`);

    for (const [pollMessageId, pollData] of Object.entries(pollProperties)) {
      // Validate poll data
      if (!this.validatePollData(pollData)) {
        Utils.logInfo(`Incomplete data found in property ${ConfigManager.POLL_PROPERTY_PREFIX}${pollMessageId}. Deleting. Data: ${JSON.stringify(pollData)}`);
        this.deletePollProperty(pollMessageId);
        continue;
      }

      const { activity, pollDateStr, checkDateTimeISO } = pollData;
      const checkDateTime = new Date(checkDateTimeISO);

      // Check if it's time to process this poll
      if (now >= checkDateTime) {
        Utils.logInfo(`Processing due poll for ${activity} on ${pollDateStr} (Msg ID: ${pollMessageId}, Check Time: ${checkDateTimeISO})`);

        try {
          // Get poll results and stop the poll
          const pollResults = this.telegramBot.stopPoll(pollMessageId);

          if (pollResults && pollResults.options) {
            // Process the results
            const processingResult = this.processPollResults(pollResults, pollData);

            // Unpin the message
            const unpinned = this.telegramBot.unpinMessage(pollMessageId);
            if (unpinned) {
              Utils.logInfo(`Poll message ${pollMessageId} unpinned successfully.`);
            } else {
              Utils.logInfo(`Failed to unpin poll message ${pollMessageId}. Check bot permissions.`);
            }

            // Remove the property after successful processing
            this.deletePollProperty(pollMessageId);
            processedCount++;

          } else {
            Utils.logError(`Poll results retrieval (${pollMessageId})`, `Failed to stop or get results for poll ${pollMessageId}. It might have been stopped manually, deleted, or API error occurred.`);
            
            // Remove the property even if we couldn't get results (avoid infinite retries)
            this.deletePollProperty(pollMessageId);
          }

        } catch (error) {
          Utils.logError(`Poll processing (${pollMessageId})`, error);
          // Remove the property to avoid infinite retries
          this.deletePollProperty(pollMessageId);
        }
      }
    }

    if (processedCount === 0) {
      Utils.logInfo("No polls were due for checking in this run.");
    }

    Utils.logInfo("Finished checkPollResults execution.");
    return processedCount;
  }

  /**
   * Validate poll data structure
   * @param {Object} pollData - Poll data to validate
   * @returns {boolean} True if valid
   */
  validatePollData(pollData) {
    return pollData && 
           pollData.activity && 
           pollData.activityStartTime && 
           pollData.pollDateStr && 
           pollData.checkDateTimeISO;
  }

  /**
   * Delete poll property
   * @param {string} messageId - Poll message ID
   */
  deletePollProperty(messageId) {
    const key = `${ConfigManager.POLL_PROPERTY_PREFIX}${messageId}`;
    PropertiesService.getScriptProperties().deleteProperty(key);
    Utils.logInfo(`Property ${key} removed after processing.`);
  }
}
