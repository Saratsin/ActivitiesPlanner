const TELEGRAM_API_BASE_URL = 'https://api.telegram.org';

class TelegramBot {

  constructor(configManager) {
    this.configManager = configManager;
  }

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

  sendMessage(chat_id, text, reply_markup = undefined) {
    return this.callApi('sendMessage', { chat_id, text, reply_markup });
  }

  sendPoll(chatId, question, options) {
    const payload = {
      chat_id: chatId,
      question: question,
      options: JSON.stringify(options),
      is_anonymous: false
    };
    return this.callApi('sendPoll', payload);
  }

  stopPoll(chatId, messageId) {
    const payload = {
      chat_id: chatId,
      message_id: messageId
    };
    return this.callApi('stopPoll', payload);
  }

  pinMessage(chatId, messageId) {
    const payload = {
      chat_id: chatId,
      message_id: messageId,
      disable_notification: false
    };
    const result = this.callApi('pinChatMessage', payload);
    return !!result;
  }

  unpinMessage(chatId, messageId) {
    const payload = {
      chat_id: chatId,
      message_id: messageId
    };
    const result = this.callApi('unpinChatMessage', payload);
    return !!result;
  }

  setMyCommands(commands, scope = { type: "all_private_chats" }) {
    return !!this.callApi('setMyCommands', { commands, scope });
  }

  editMessageReplyMarkup(chat_id, message_id, reply_markup) {
    return !!this.callApi('editMessageReplyMarkup', { chat_id, message_id, reply_markup });
  }

  deleteMessage(chat_id, message_id) {
    return !!this.callApi('deleteMessage', { chat_id, message_id });
  }

  getUpdatesApi(payload) {
    return this.callApi('getUpdates', payload);
  }

  setWebhook() {
    var url = this.configManager.getWebhookUrl();
    var apiKey = this.configManager.getWebhookApiKey();
    var telegramBotWebHookUrl = `${url}?apiKey=${apiKey}`;
    Utils.logInfo(`Setting webhook to: ${telegramBotWebHookUrl}`);
    return !!this.callApi('setWebhook', { url: telegramBotWebHookUrl });
  }

  callApi(method, payload) {
    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'payload': JSON.stringify(payload),
      'muteHttpExceptions': true
    };

    try {
      const botToken = this.configManager.getTelegramBotToken();
      const response = UrlFetchApp.fetch(`${TELEGRAM_API_BASE_URL}/bot${botToken}/${method}`, options);
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
}
