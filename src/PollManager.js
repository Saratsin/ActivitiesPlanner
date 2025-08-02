/**
 * PollManager - Handles poll data management and Telegram poll operations
 */
class PollManager {
  constructor(configManager, telegramBot) {
    this.configManager = configManager;
    this.telegramBot = telegramBot;
  }

  /**
   * Format date string for messages
   * @param {Date} date - Date to format
   * @returns {string} Formatted date string (dd.MM)
   */
  formatDateString(date) {
    return Utilities.formatDate(date, ConfigManager.SCRIPT_TIMEZONE, 'dd.MM');
  }

  /**
   * Check if poll already exists for activity and date
   * @param {string} activity - Activity name
   * @param {string} activityStartTime - Activity start time
   * @param {string} pollDateStr - Poll date string
   * @returns {boolean} True if poll already exists
   */
  isPollAlreadyScheduled(activity, activityStartTime, pollDateStr) {
    const scriptProperties = PropertiesService.getScriptProperties();
    const properties = scriptProperties.getProperties();

    for (const key in properties) {
      if (key.startsWith(ConfigManager.POLL_PROPERTY_PREFIX)) {
        try {
          const pollData = JSON.parse(properties[key]);
          if (pollData.activity === activity && 
              pollData.activityStartTime === activityStartTime && 
              pollData.pollDateStr === pollDateStr) {
            Utils.logInfo(`Active poll for ${activity} on ${pollDateStr} already exists in properties. Skipping creation.`);
            return true;
          }
        } catch (e) {
          Utils.logError(`Property parsing (${key})`, e);
          scriptProperties.deleteProperty(key);
        }
      }
    }
    return false;
  }

  /**
   * Store poll data in script properties
   * @param {string} pollMessageId - Telegram message ID
   * @param {Object} pollData - Poll data to store
   */
  storePollData(pollMessageId, pollData) {
    const key = `${ConfigManager.POLL_PROPERTY_PREFIX}${pollMessageId}`;
    try {
      PropertiesService.getScriptProperties().setProperty(key, JSON.stringify(pollData));
      Utils.logInfo(`Poll details for message ${pollMessageId} recorded in ScriptProperties. Check time: ${pollData.checkDateTimeISO}`);
    } catch (e) {
      Utils.logError('Poll data storage', e);
      throw e;
    }
  }

  /**
   * Send voting poll via Telegram
   * @param {string} activity - Activity name
   * @param {string} activityStartTime - Activity start time
   * @param {string} activityDateStr - Activity date string
   * @returns {Object|null} Sent poll message or null if failed
   */
  sendPoll(activity, activityStartTime, activityDateStr) {
    const pollQuestion = `${this.configManager.getMessage('pollQuestion')} "${activity}" ${activityDateStr} ${activityStartTime}?`;
    const pollOptions = this.configManager.getMessage('pollOptions');
    
    return this.telegramBot.sendPoll(pollQuestion, pollOptions);
  }

  /**
   * Send poll and store its data
   * @param {string} activity - Activity name
   * @param {string} activityStartTime - Activity start time
   * @param {string} pollDateStr - Poll date string
   * @param {Date} checkDateTime - When to check poll results
   * @returns {Object|null} Result with success status and message ID
   */
  sendAndStorePoll(activity, activityStartTime, pollDateStr, checkDateTime) {
    // Check if poll already exists
    if (this.isPollAlreadyScheduled(activity, activityStartTime, pollDateStr)) {
      return { success: false, reason: 'already_exists' };
    }

    // Send the poll
    const sentPollMessage = this.sendPoll(activity, activityStartTime, pollDateStr);
    
    if (sentPollMessage && sentPollMessage.message_id) {
      const pollMessageId = sentPollMessage.message_id;
      Utils.logInfo(`Poll sent successfully. Message ID: ${pollMessageId}`);

      // Try to pin the message
      const pinned = this.telegramBot.pinMessage(pollMessageId);
      if (pinned) {
        Utils.logInfo(`Poll message ${pollMessageId} pinned successfully.`);
      } else {
        Utils.logInfo(`Failed to pin poll message ${pollMessageId}. Check bot permissions.`);
      }

      // Create poll data object
      const pollData = {
        activity: activity,
        activityStartTime: activityStartTime,
        pollDateStr: pollDateStr,
        checkDateTimeISO: checkDateTime.toISOString()
      };

      Utils.logInfo(`Calculated check time: ${checkDateTime.toISOString()} based on delay from poll creation`);

      // Store poll data
      this.storePollData(pollMessageId, pollData);
      
      return { success: true, messageId: pollMessageId, pollData: pollData };
    } else {
      Utils.logError('Poll sending', `Failed to send poll for ${activity}.`);
      return { success: false, reason: 'send_failed' };
    }
  }

  /**
   * Get all stored poll properties
   * @returns {Object} Object with poll message IDs as keys and poll data as values
   */
  getAllPollProperties() {
    const scriptProperties = PropertiesService.getScriptProperties();
    const properties = scriptProperties.getProperties();
    const pollProperties = {};

    for (const key in properties) {
      if (key.startsWith(ConfigManager.POLL_PROPERTY_PREFIX)) {
        const messageId = key.replace(ConfigManager.POLL_PROPERTY_PREFIX, '');
        
        // Validate message ID format
        if (!/^\d+$/.test(messageId)) {
          Utils.logInfo(`Invalid message ID found in property key: ${key}. Deleting.`);
          scriptProperties.deleteProperty(key);
          continue;
        }

        try {
          const pollData = JSON.parse(properties[key]);
          pollProperties[messageId] = pollData;
        } catch (e) {
          Utils.logError(`Property parsing (${key} for message ID ${messageId})`, e);
          scriptProperties.deleteProperty(key);
        }
      }
    }

    return pollProperties;
  }

  /**
   * Delete poll property
   * @param {string} messageId - Poll message ID
   */
  deletePollProperty(messageId) {
    const key = `${ConfigManager.POLL_PROPERTY_PREFIX}${messageId}`;
    PropertiesService.getScriptProperties().deleteProperty(key);
    Utils.logInfo(`Property ${key} removed.`);
  }

  /**
   * Clear all poll properties
   * @returns {number} Number of properties cleared
   */
  clearAllPollProperties() {
    const scriptProperties = PropertiesService.getScriptProperties();
    const properties = scriptProperties.getProperties();
    let deletedCount = 0;

    for (const key in properties) {
      if (key.startsWith(ConfigManager.POLL_PROPERTY_PREFIX)) {
        scriptProperties.deleteProperty(key);
        Utils.logInfo(`Deleted property: ${key}`);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      Utils.logInfo(`Cleared ${deletedCount} poll properties.`);
    } else {
      Utils.logInfo("No poll properties found to clear.");
    }

    return deletedCount;
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
}
