class PollManager {
  constructor(configManager, telegramBot) {
    this.configManager = configManager;
    this.telegramBot = telegramBot;
  }

  trySendAndStorePoll(groupEventData) {
    // Check if poll already exists
    if (this.isPollAlreadyScheduled(groupEventData)) {
      return { success: false, reason: 'already_exists' };
    }

    // Send the poll
    const sentPollMessage = this.sendPoll(groupEventData);
    
    if (sentPollMessage && sentPollMessage.message_id) {
      const pollMessageId = sentPollMessage.message_id;
      Utils.logInfo(`Poll sent successfully. Message ID: ${pollMessageId}`);

      // Try to pin the message
      const pinned = this.pinMessage(pollMessageId);
      if (pinned) {
        Utils.logInfo(`Poll message ${pollMessageId} pinned successfully.`);
      } else {
        Utils.logInfo(`Failed to pin poll message ${pollMessageId}. Check bot permissions.`);
      }
      
      // Store poll data
      this.storePollData(pollMessageId, groupEventData);
      
      return { success: true, messageId: pollMessageId };
    } else {
      Utils.logError('Poll sending', `Failed to send poll for ${groupEventData}.`);
      return { success: false, reason: 'send_failed' };
    }
  }

  isPollAlreadyScheduled(groupEventData) {
    const scriptProperties = PropertiesService.getScriptProperties();
    const allProperties = scriptProperties.getProperties();

    for (const key in allProperties) {
      if (key.startsWith(CONFIG_POLL_PROPERTY_PREFIX)) {
        try {
          const alreadyScheduledGroupEventData = GroupEventData.parseFromJson(allProperties[key]);
          if (alreadyScheduledGroupEventData.id === groupEventData.id) {
            Utils.logInfo(`Active poll for ${groupEventData.getActivityName()} on ${groupEventData.startDateTime} already exists in properties. Skipping creation.`);
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

  sendPoll(groupEventData) {
    const chatId = this.configManager.getTargetGroupChatId();

    const pollQuestion = `${groupEventData.getActivityName()} ${groupEventData.getStartDateTimeString()}`;
    const pollOptions = this.configManager.getMessage('pollOptions');

    return this.telegramBot.sendPoll(chatId, pollQuestion, pollOptions);
  }

  storePollData(pollMessageId, groupEventData) {
    const key = `${CONFIG_POLL_PROPERTY_PREFIX}${pollMessageId}`;
    try {
      PropertiesService.getScriptProperties().setProperty(key, JSON.stringify(groupEventData));
      Utils.logInfo(`Poll details for message ${pollMessageId} recorded in ScriptProperties. Check time: ${groupEventData.pollVotesCountingDateTime}`);
    } catch (e) {
      Utils.logError('Poll data storage', e);
      throw e;
    }
  }

  pinMessage(messageId) {
    const chatId = this.configManager.getTargetGroupChatId();
    return this.telegramBot.pinMessage(chatId, messageId);
  }

  getAllPollProperties() {
    const scriptProperties = PropertiesService.getScriptProperties();
    const properties = scriptProperties.getProperties();
    const pollProperties = {};

    for (const key in properties) {
      if (key.startsWith(CONFIG_POLL_PROPERTY_PREFIX)) {
        const messageId = key.substring(CONFIG_POLL_PROPERTY_PREFIX.length);
        
        // Validate message ID format
        if (!/^\d+$/.test(messageId)) {
          Utils.logInfo(`Invalid message ID found in property key: ${key}. Deleting.`);
          scriptProperties.deleteProperty(key);
          continue;
        }

        try {
          const groupEventData = GroupEventData.parseFromJson(properties[key]);
          pollProperties[messageId] = groupEventData;
        } catch (e) {
          Utils.logError(`Property parsing (${key} for message ID ${messageId})`, e);
          scriptProperties.deleteProperty(key);
        }
      }
    }

    return pollProperties;
  }

  deletePollProperty(messageId) {
    const key = `${CONFIG_POLL_PROPERTY_PREFIX}${messageId}`;
    PropertiesService.getScriptProperties().deleteProperty(key);
    Utils.logInfo(`Property ${key} removed.`);
  }

  clearAllPollProperties() {
    const scriptProperties = PropertiesService.getScriptProperties();
    const properties = scriptProperties.getProperties();
    let deletedCount = 0;

    for (const key in properties) {
      if (key.startsWith(CONFIG_POLL_PROPERTY_PREFIX)) {
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
}
