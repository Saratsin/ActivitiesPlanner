/**
 * TelegramBot - Handles all Telegram API interactions
 */
class TelegramBot {
  static TELEGRAM_API_BASE_URL = 'https://api.telegram.org';

  constructor(configManager) {
    this.configManager = configManager;
  }

  /**
   * Make a request to the Telegram API
   * @param {string} method - API method name
   * @param {Object} payload - Request payload
   * @returns {Object|null} API response result or null on error
   */
  callApi(method, payload) {
    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'payload': JSON.stringify(payload),
      'muteHttpExceptions': true
    };

    try {
      const botToken = this.configManager.getTelegramBotToken();
      const response = UrlFetchApp.fetch(`${TelegramBot.TELEGRAM_API_BASE_URL}/bot${botToken}/${method}`, options);
      const responseCode = response.getResponseCode();
      const responseBody = response.getContentText();

      if (!responseBody) {
        Utils.logError(`Telegram API (${method})`, `Empty response body. Code: ${responseCode}`);
        return null;
      }

      let jsonResponse;
      try {
        jsonResponse = JSON.parse(responseBody);
      } catch (e) {
        Utils.logError(`Telegram API (${method})`, `Error parsing JSON response. Code: ${responseCode}, Response: ${responseBody}, Error: ${e}`);
        return null;
      }
      
      if (responseCode === 200 && jsonResponse.ok) {
        Utils.logInfo(`Telegram API call successful: ${method}`);
        return jsonResponse.result;
      } else {
        Utils.logError(`Telegram API (${method})`, `API error. Code: ${responseCode}, Response: ${responseBody}`);
        return null;
      }
    } catch (error) {
      Utils.logError(`Telegram API (${method})`, `Exception during API call: ${error}`);
      return null;
    }
  }

  /**
   * Send a text message
   * @param {string|number} chatId - Target chat ID
   * @param {string} text - Message text
   * @param {number} [replyToMessageId] - Optional message ID to reply to
   * @returns {Object|null} Sent message object or null
   */
  sendMessage(chatId, text, replyToMessageId = null) {
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    };
    if (replyToMessageId) {
      payload.reply_to_message_id = replyToMessageId;
    }
    return this.callApi('sendMessage', payload);
  }

  /**
   * Send a poll
   * @param {string|number} chatId - Target chat ID
   * @param {string} question - Poll question
   * @param {string[]} options - Poll options
   * @returns {Object|null} Sent message object containing the poll or null
   */
  sendPoll(chatId, question, options) {
    const payload = {
      chat_id: chatId,
      question: question,
      options: JSON.stringify(options),
      is_anonymous: false
    };
    return this.callApi('sendPoll', payload);
  }

  /**
   * Pin a message
   * @param {string|number} chatId - Target chat ID
   * @param {number} messageId - Message ID to pin
   * @returns {boolean} True if successful
   */
  pinMessage(chatId, messageId) {
    const payload = {
      chat_id: chatId,
      message_id: messageId,
      disable_notification: false
    };
    const result = this.callApi('pinChatMessage', payload);
    return !!result;
  }

  /**
   * Unpin a message
   * @param {string|number} chatId - Target chat ID
   * @param {number} messageId - Message ID to unpin
   * @returns {boolean} True if successful
   */
  unpinMessage(chatId, messageId) {
    const payload = {
      chat_id: chatId,
      message_id: messageId
    };
    const result = this.callApi('unpinChatMessage', payload);
    return !!result;
  }

  /**
   * Stop a poll and get results
   * @param {string|number} chatId - Target chat ID
   * @param {number} messageId - Message ID containing the poll
   * @returns {Object|null} Poll object with results or null
   */
  stopPoll(chatId, messageId) {
    const payload = {
      chat_id: chatId,
      message_id: messageId
    };
    return this.callApi('stopPoll', payload);
  }

  /**
   * Send test message
   * @returns {boolean} Success status
   */
  sendTestMessage() {
    const targetGroupChatId = this.configManager.getTargetGroupChatId();
    const result = this.sendMessage(targetGroupChatId, ConfigManager.MESSAGES.testMessage);
    if (result) {
      Utils.logInfo("Test message sent successfully.");
      return true;
    } else {
      Utils.logError("Test message", "Failed to send test message. Check BOT_TOKEN and TARGET_CHAT_ID properties in script settings.");
      return false;
    }
  }
}
