/**
 * Configuration Section
 * =====================
 */

const IS_QA_TESTING = false;

// --- Bot Behavior Configuration ---
const POLL_CREATION_HOUR = 9; // Hour to create the poll (e.g., 9 for 09:00)
const POLL_CHECK_HOUR = 17;    // Hour to check the poll results (e.g., 17 for 17:00) - Primarily for reference now
const MIN_VOTES_REQUIRED = 6;  // Minimum '✅' votes needed to confirm
const MIN_BASKETBALL_VOTES_REQUIRED = 4;
const SCRIPT_TIMEZONE = Session.getScriptTimeZone(); // Timezone of the script project

// --- Voting Schedule Configuration ---
// Define the activity and the delay in minutes until the poll results should be checked.
// Delay is calculated from the moment the poll is created (around POLL_CREATION_HOUR).
// DayOfWeek: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
const VOTING_SCHEDULE = {
  0: { activity: 'Баскетбол', activityStartTime: '18:00', checkDelayMinutes: (POLL_CHECK_HOUR-POLL_CREATION_HOUR)*60-1    }, // Sunday: Check same day ~17:00
  // Day: { activity: 'Activity Name', checkDelayMinutes: Delay }
  2: { activity: 'Футбол'   , activityStartTime: '19:00', checkDelayMinutes: (POLL_CHECK_HOUR-POLL_CREATION_HOUR)*60-1    }, // Tuesday: Check same day ~17:00
  3: { activity: 'Баскетбол', activityStartTime: '18:00', checkDelayMinutes: (POLL_CHECK_HOUR-POLL_CREATION_HOUR)*60-1    }, // Wednesday: Check same day ~17:00
  4: { activity: 'Футбол', activityStartTime: '19:00', checkDelayMinutes: (POLL_CHECK_HOUR-POLL_CREATION_HOUR)*60-1 }, // Thursday: Check same day ~17:00
  //5: { activity: 'Баскетбол', activityStartTime: '18:00', checkDelayMinutes: (POLL_CHECK_HOUR-POLL_CREATION_HOUR)*60-1    }  // Friday: Check same day ~17:00
};

// --- Text Constants & Templates (User-Facing Only) ---
const MESSAGES = {
  pollQuestion: (activity, activityStartTime, dateStr) => `${activity} ${activityStartTime} (${dateStr})`,
  pollOptions: ['✅', '❌'],
  bookingSecured: (votes, activity, dateStr) => `✅ ${votes} людей проголосувало за. Бронювання для ${activity}у (${dateStr}) залишається в силі 💪\n\nБронювання спортмайданчика: \nhttps://simpleurl.tech/na-sm-booking \n\nКалендар з бронюваннями: \nhttps://simpleurl.tech/na-sm-calendar`,
  bookingCancelled: (votes, activity, activityStartTime, dateStr) => `❌ Лише ${votes} ${votes === 1 ? 'людина проголосувала' : 'людей проголосувало'} за. Бронювання для ${activity}у (${dateStr}) скасовано, слоти після ${activityStartTime} сьогодні вільні.\n\nБронювання спортмайданчика: \nhttps://simpleurl.tech/na-sm-booking \n\nКалендар з бронюваннями: \nhttps://simpleurl.tech/na-sm-calendar`,
  infoStateReset: (count) => `ℹ️ Дані по голосуваннях в боті скинуто: Видалено ${count} ${count === 1 ? 'активний запис' : 'активних записів'}.`,
  testMessage: "Усім привіт :)\n\nЯ телеграм-бот який буде допомагати з груповими активностями на спортивному майданчику в НА. Десь між 09 і 10 ранку я запускатиму голосування щодо відповідної активності яка наступна в розкладі (наприклад в середу буде запускатись голосування щодо баскетболу в четвер, в інші дні голосування буде день у день).\n\nПотім в день цієї активності десь між 17:00 та 17:10 я погляну скільки людей проголосувало за. Якщо менше 6, то бронь на активність буде скасована, і слоти стануть доступні для бронювання. Якщо ж 6 і більше людей буде за, то бронь залишатиметься в силі.\n\nСподіваюсь я полегшу вам життя з часом, і переваг від мого існування буде більше ніж недоліків)"
};

// --- Telegram API Base URL ---
const TELEGRAM_API_BASE_URL = 'https://api.telegram.org';

/**
 * Helper function to make requests to the Telegram API.
 * Includes basic error logging for failed requests.
 * @param {string} method - The Telegram API method name (e.g., 'sendMessage', 'sendPoll').
 * @param {object} payload - The data payload for the API method.
 * @returns {object|null} - The JSON response's 'result' object from Telegram or null on error.
 */
function callTelegramApi(method, payload) {
  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true // Prevent script failure on API errors, handle them manually
  };

  try {
    const botToken = getTelegramBotToken();
    const response = UrlFetchApp.fetch(`${TELEGRAM_API_BASE_URL}/bot${botToken}/${method}`, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    // Handle potential non-JSON responses or empty bodies
    if (!responseBody) {
        Logger.log(`Empty response body from Telegram API (${method}). Code: ${responseCode}`);
        return null;
    }

    let jsonResponse;
    try {
        jsonResponse = JSON.parse(responseBody);
    } catch (e) {
        Logger.log(`Error parsing JSON response from Telegram API (${method}). Code: ${responseCode}, Response: ${responseBody}, Error: ${e}`);
        return null;
    }
    
    if (responseCode === 200 && jsonResponse.ok) {
      Logger.log(`Telegram API call successful: ${method}`);
      return jsonResponse.result;
    } else {
      Logger.log(`Error calling Telegram API (${method}). Code: ${responseCode}, Response: ${responseBody}`);
      // Optionally send an alert to yourself
      // MailApp.sendEmail('your_email@example.com', 'Telegram Bot Error', `Error calling ${method}: ${responseBody}`);
      return null;
    }
  } catch (error) {
    Logger.log(`Exception during Telegram API call (${method}): ${error}`);
    // Optionally send an alert
    // MailApp.sendEmail('your_email@example.com', 'Telegram Bot Exception', `Exception calling ${method}: ${error}`);
    return null;
  }
}

// --- Telegram API Wrapper Functions ---

/**
 * Sends a text message to the target chat.
 * @param {string|number} chatId - The target chat ID.
 * @param {string} text - The message text.
 * @param {number} [replyToMessageId] - Optional message ID to reply to.
 * @returns {object|null} - The sent message object or null.
 */
function sendTelegramMessage(chatId, text, replyToMessageId = null) {
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown' // Or 'HTML' if needed
  };
  if (replyToMessageId) {
    payload.reply_to_message_id = replyToMessageId;
  }
  return callTelegramApi('sendMessage', payload);
}

/**
 * Sends a poll to the target chat.
 * @param {string|number} chatId - The target chat ID.
 * @param {string} question - The poll question.
 * @param {string[]} options - An array of poll option strings (e.g., ['✅', '❌']).
 * @returns {object|null} - The sent message object containing the poll, or null.
 */
function sendTelegramPoll(chatId, question, options) {
  const payload = {
    chat_id: chatId,
    question: question,
    options: JSON.stringify(options),
    is_anonymous: false
  };
  return callTelegramApi('sendPoll', payload);
}

/**
 * Pins a message in the target chat. Requires admin rights for the bot.
 * @param {string|number} chatId - The target chat ID.
 * @param {number} messageId - The ID of the message to pin.
 * @returns {boolean} - True if successful, false otherwise.
 */
function pinTelegramMessage(chatId, messageId) {
  const payload = {
    chat_id: chatId,
    message_id: messageId,
    disable_notification: false
  };
  const result = callTelegramApi('pinChatMessage', payload);
  return result;
}

/**
 * Unpins a specific message in the target chat. Requires admin rights.
 * @param {string|number} chatId - The target chat ID.
 * @param {number} messageId - The ID of the message to unpin.
 * @returns {boolean} - True if successful, false otherwise.
 */
function unpinTelegramMessage(chatId, messageId) {
  const payload = {
    chat_id: chatId,
    message_id: messageId
  };
  const result = callTelegramApi('unpinChatMessage', payload);
  return result;
}

/**
 * Stops a poll and retrieves the final results.
 * @param {string|number} chatId - The target chat ID.
 * @param {number} messageId - The ID of the message containing the poll.
 * @returns {object|null} - The Poll object with results, or null.
 */
function stopTelegramPoll(chatId, messageId) {
  const payload = {
    chat_id: chatId,
    message_id: messageId
  };
  return callTelegramApi('stopPoll', payload);
}

// --- Core Logic Functions ---

function cancelCalendarEvent(activity, activityDateStr) {
  cancelCalendarEventForActivity(activity, activityDateStr)
}

/**
 * Checks the VOTING_SCHEDULE and creates a poll if today is a scheduled day.
 * Records the poll details using ScriptProperties, calculating the check time based on the configured delay.
 * INTENDED TO BE RUN BY A TIME-DRIVEN TRIGGER (e.g., daily at POLL_CREATION_HOUR).
 */
function sendVotingPoll() {
  const today = new Date(); // This is the moment the script runs (poll creation time)

  // Set the time precisely to the configured hour for consistent delay calculation
  today.setHours(POLL_CREATION_HOUR, 0, 0, 0);

  const currentDayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday

  Logger.log(`Running sendVotingPoll for day ${currentDayOfWeek}.`);

  // --- Check if today has a scheduled activity for voting ---
  const scheduleEntry = VOTING_SCHEDULE[currentDayOfWeek];

  if (scheduleEntry && scheduleEntry.activity && scheduleEntry.checkDelayMinutes) {
    const activity = scheduleEntry.activity;
    const activityStartTime = scheduleEntry.activityStartTime;
    const checkDelayMinutes = scheduleEntry.checkDelayMinutes;
    Logger.log(`Today is scheduled for voting for: ${activity} with check delay: ${checkDelayMinutes} minutes.`);

    // Format date for the message (e.g., 03.05)
    // Use the date the poll is created for the message text
    const pollDateStr = Utilities.formatDate(today, SCRIPT_TIMEZONE, 'dd.MM');

    // Calculate the actual activity date based on the delay for the poll question text
    const activityDateTime = new Date(today.getTime() + checkDelayMinutes * 60 * 1000);
    const activityDateStr = Utilities.formatDate(activityDateTime, SCRIPT_TIMEZONE, 'dd.MM');

    const pollQuestion = MESSAGES.pollQuestion(activity, activityStartTime, activityDateStr);
    const pollOptions = MESSAGES.pollOptions;

    // --- Check if a poll for this activity/date already exists in properties ---
    const scriptProperties = PropertiesService.getScriptProperties();
    const properties = scriptProperties.getProperties();

    let alreadyScheduled = false;
    for (const key in properties) {
      if (key.startsWith(POLL_PROPERTY_PREFIX)) {
        try {
          const pollData = JSON.parse(properties[key]);
          // Check if activity and date match an existing *active* poll
          // Note: We check pollDateStr which is based on creation day.
          // This prevents creating a duplicate poll if the script runs multiple times on the same day.
          if (pollData.activity === activity && pollData.activityStartTime === activityStartTime && pollData.pollDateStr === pollDateStr) {
            alreadyScheduled = true;
            Logger.log(`Active poll for ${activity} on ${pollDateStr} already exists in properties. Skipping creation.`);
            break;
          }
        } catch (e) {
          Logger.log(`Error parsing property ${key}: ${e}. Deleting invalid property.`);
          scriptProperties.deleteProperty(key); // Clean up invalid data
        }
      }
    }

    if (alreadyScheduled) {
      Logger.log("Finished sendVotingPoll (found existing poll).");
      return; // Exit if already scheduled
    }

    // --- Send the poll ---
    const targetGroupChatId = getTargetGroupChatId();
    const sentPollMessage = sendTelegramPoll(targetGroupChatId, pollQuestion, pollOptions);

    if (sentPollMessage && sentPollMessage.message_id) {
      const pollMessageId = sentPollMessage.message_id;
      Logger.log(`Poll sent successfully. Message ID: ${pollMessageId}`);

      // --- Pin the message ---
      const pinned = pinTelegramMessage(targetGroupChatId, pollMessageId);
      if (pinned) {
        Logger.log(`Poll message ${pollMessageId} pinned successfully.`);
      } else {
        Logger.log(`Failed to pin poll message ${pollMessageId}. Check bot permissions.`);
        // Proceed even if pinning fails, but log it.
      }

      // --- Record in Script Properties ---
      // Calculate the check date/time by adding the delay to the creation time
      const checkDateTime = new Date(today.getTime() + checkDelayMinutes * 60 * 1000); // Add delay in milliseconds
      const checkDateTimeISO = checkDateTime.toISOString();

      Logger.log(`Calculated check time: ${checkDateTimeISO} based on delay ${checkDelayMinutes} mins from ${today.toISOString()}`);

      const pollDataToStore = {
        activity: activity,
        activityStartTime: activityStartTime,
        pollDateStr: pollDateStr, // Store the creation date string
        activityDateStr: activityDateStr, // Store the activity date string (used in messages)
        checkDateTimeISO: checkDateTimeISO, // Store the calculated check timestamp
        chatId: targetGroupChatId // Store chat ID
      };

      try {
        // Store the data with the message ID as part of the key
        scriptProperties.setProperty(POLL_PROPERTY_PREFIX + pollMessageId, JSON.stringify(pollDataToStore));
        Logger.log(`Poll details for message ${pollMessageId} recorded in ScriptProperties. Check time: ${checkDateTimeISO}`);
      } catch (e) {
         Logger.log(`Error saving poll data to ScriptProperties: ${e}`);
         // Maybe try to delete the poll message if storage fails? Or just alert.
         sendTelegramMessage(targetGroupChatId, `⚠️ Bot Error: Failed to save poll state for ${activity}. Please check logs.`);
      }

    } else {
      Logger.log(`Failed to send poll for ${activity}.`);
      sendTelegramMessage(targetGroupChatId, `⚠️ Bot Error: Failed to send poll for ${activity}.`);
    }
  } else {
      Logger.log(`No valid voting activity or delay configured for today (Day ${currentDayOfWeek}).`);
  }
  Logger.log("Finished sendVotingPoll execution.");
}


/**
 * Checks ScriptProperties for any polls whose checkDateTime has passed.
 * Stops the poll, evaluates results, sends a status message, unpins the poll,
 * and removes the property. Calls cancelCalendarEvent if vote fails.
 * INTENDED TO BE RUN BY A TIME-DRIVEN TRIGGER (e.g., daily at POLL_CHECK_HOUR).
 */
function checkPollResults() {
  const now = new Date();
  const scriptProperties = PropertiesService.getScriptProperties();
  const properties = scriptProperties.getProperties();

  Logger.log(`Running checkPollResults at ${now.toISOString()}. Checking ${Object.keys(properties).length} potential poll properties.`);

  let processedCount = 0;

  for (const key in properties) {
    // Ensure we only process properties related to this script's polls
    if (key.startsWith(POLL_PROPERTY_PREFIX)) {
      const pollMessageIdStr = key.substring(POLL_PROPERTY_PREFIX.length);
      const pollMessageId = parseInt(pollMessageIdStr, 10);

      // Validate the extracted message ID
      if (isNaN(pollMessageId)) {
          Logger.log(`Invalid message ID found in property key: ${key}. Deleting.`);
          scriptProperties.deleteProperty(key);
          continue;
      }

      let pollData;
      try {
        pollData = JSON.parse(properties[key]);
      } catch (e) {
        Logger.log(`Error parsing property ${key} for message ID ${pollMessageId}: ${e}. Deleting invalid property.`);
        scriptProperties.deleteProperty(key); // Clean up invalid data
        continue;
      }

      // Ensure essential data exists
      if (!pollData.activity || !pollData.activityStartTime || !pollData.pollDateStr || !pollData.activityDateStr || !pollData.checkDateTimeISO || !pollData.chatId) {
          Logger.log(`Incomplete data found in property ${key}. Deleting. Data: ${JSON.stringify(pollData)}`);
          scriptProperties.deleteProperty(key);
          continue;
      }

      // Use activityDateStr for user messages now
      const { activity, activityStartTime, activityDateStr, checkDateTimeISO, chatId } = pollData;
      const checkDateTime = new Date(checkDateTimeISO);

      // Check if the poll's designated check time has passed
      if (now >= checkDateTime) {
        processedCount++;
        Logger.log(`Processing due poll for ${activity} on ${activityDateStr} (Msg ID: ${pollMessageId}, Check Time: ${checkDateTimeISO})`);

        // --- Stop the poll to get final results ---
        const pollResults = stopTelegramPoll(chatId, pollMessageId);

        if (pollResults && pollResults.options) {
          let votesFor = 0;
          // Find the '✅' option and get its vote count
          for (const option of pollResults.options) {
            if (option.text === MESSAGES.pollOptions[0]) { // Check for '✅' using constant
              votesFor = option.voter_count;
              break;
            }
          }
          Logger.log(`Poll results: ${votesFor} voted '${MESSAGES.pollOptions[0]}'`);

          let finalMessage = '';

          const minVotesRequired = activity === 'Баскетбол' ? MIN_BASKETBALL_VOTES_REQUIRED : MIN_VOTES_REQUIRED;

          // --- Evaluate results ---
          if (votesFor >= minVotesRequired) {
            finalMessage = MESSAGES.bookingSecured(votesFor, activity, activityDateStr);
            Logger.log(`Booking CONFIRMED for ${activity}`);
          } else {
            finalMessage = MESSAGES.bookingCancelled(votesFor, activity, activityStartTime, activityDateStr);
            Logger.log(`Booking CANCELLED for ${activity}`);
            // --- Call placeholder to cancel calendar event ---
            cancelCalendarEvent(activity, activityDateStr);
            // -------------------------------------------------
          }

          // --- Send status update message (reply to original poll) ---
          sendTelegramMessage(chatId, finalMessage, pollMessageId);

          // --- Unpin the original poll message ---
          const unpinned = unpinTelegramMessage(chatId, pollMessageId);
          if (unpinned) {
            Logger.log(`Poll message ${pollMessageId} unpinned successfully.`);
          } else {
            Logger.log(`Failed to unpin poll message ${pollMessageId}. Check bot permissions.`);
          }

          // --- Remove property from ScriptProperties ---
          scriptProperties.deleteProperty(key);
          Logger.log(`Property ${key} removed after successful processing.`);

        } else {
          Logger.log(`Failed to stop or get results for poll ${pollMessageId}. It might have been stopped manually, deleted, or API error occurred.`);
          // Send an error message to the chat
          sendTelegramMessage(chatId, `⚠️ Bot Error: Could not get results for poll ${pollMessageId} for ${activity} (${activityDateStr}). Please check manually.`);
          // Optionally try to unpin anyway if possible
          unpinTelegramMessage(chatId, pollMessageId);
          // Remove the property to prevent re-checking this failed poll
          scriptProperties.deleteProperty(key);
          Logger.log(`Property ${key} removed due to error during result retrieval.`);
        }
      } else {
         // Logger.log(`Poll ${pollMessageId} is not yet due for checking (Check Time: ${checkDateTimeISO}). Skipping.`);
      } // end if time check
    } // end if key starts with prefix
  } // end loop through properties

  if (processedCount === 0) {
    Logger.log("No polls were due for checking in this run.");
  }
  Logger.log("Finished checkPollResults execution.");
}


/**
 * OPTIONAL: A function to test sending a simple message.
 * Run this manually from the script editor to test token/chat ID.
 */
function testSendMessage() {
  const targetGroupChatId = getTargetGroupChatId();
  const result = sendTelegramMessage(targetGroupChatId, MESSAGES.testMessage);
  if (result) {
    Logger.log("Test message sent successfully.");
  } else {
    Logger.log("Failed to send test message. Check BOT_TOKEN and TARGET_CHAT_ID properties in script settings.");
  }
}

/**
 * MANUAL: A function to test creating a poll manually and storing its state using the configured delay.
 * Simulates what sendVotingPoll does.
 */
function testSendVotingPollAndStore() {
   let today = new Date();
      
   // Set the time to the poll creation hour
   // setHours(hour, min, sec, ms)
   today.setHours(POLL_CREATION_HOUR, 0, 0, 0);

   const testDay = 3; // Wednesday example to test longer delay
   const scheduleEntry = VOTING_SCHEDULE[testDay];

   if (!scheduleEntry || !scheduleEntry.activity || !scheduleEntry.checkDelayMinutes) {
     Logger.log(`No valid schedule entry defined for test day ${testDay} in VOTING_SCHEDULE. Aborting test.`);
     return;
   }
   const activity = scheduleEntry.activity;
   const activityStartTime = scheduleEntry.activityStartTime;
   const checkDelayMinutes = scheduleEntry.checkDelayMinutes;

   const pollDateStr = Utilities.formatDate(today, SCRIPT_TIMEZONE, 'dd.MM');
   const activityDateTime = new Date(today.getTime() + checkDelayMinutes * 60 * 1000);
   const activityDateStr = Utilities.formatDate(activityDateTime, SCRIPT_TIMEZONE, 'dd.MM');

   const pollQuestion = `${MESSAGES.pollQuestion(activity, activityStartTime, activityDateStr)}`;
   const pollOptions = MESSAGES.pollOptions;
   const targetGroupChatId = getTargetGroupChatId();
   const result = sendTelegramPoll(targetGroupChatId, pollQuestion, pollOptions);

    if (result && result.message_id) {
      const pollMessageId = result.message_id;
      Logger.log(`Test poll sent. Message ID: ${pollMessageId}`);

      // --- Pin the message ---
      const pinned = pinTelegramMessage(targetGroupChatId, pollMessageId);
      if (pinned) {
        Logger.log(`Poll message ${pollMessageId} pinned successfully.`);
      } else {
        Logger.log(`Failed to pin poll message ${pollMessageId}. Check bot permissions.`);
        // Proceed even if pinning fails, but log it.
      }

      // Manually store for testing checkPollResults
      const scriptProperties = PropertiesService.getScriptProperties();

      // Calculate the check time by adding the configured delay
      const checkDateTime = new Date(today.getTime() + checkDelayMinutes * 60 * 1000);

      // Set check time a few minutes *from now* for easier testing, overriding calculated time
      const testCheckDateTime = new Date(); // Use current time for test trigger
      testCheckDateTime.setMinutes(testCheckDateTime.getMinutes() + 1); // Add 1 minute for testing trigger

      Logger.log(`Original calculated check time for test: ${checkDateTime.toISOString()}`);
      Logger.log(`Overriding check time for immediate testing to: ${testCheckDateTime.toISOString()}`);

      const pollDataToStore = {
        activity: activity,
        activityStartTime: activityStartTime,
        pollDateStr: pollDateStr,
        activityDateStr: activityDateStr, // Store activity date too
        checkDateTimeISO: testCheckDateTime.toISOString(), // Use overridden time for test
        chatId: targetGroupChatId
      };
      try {
        scriptProperties.setProperty(POLL_PROPERTY_PREFIX + pollMessageId, JSON.stringify(pollDataToStore));
        Logger.log(`Test poll details for message ${pollMessageId} recorded in ScriptProperties. Set to check at ${testCheckDateTime.toISOString()}`);
      } catch (e) {
         Logger.log(`Error saving test poll data to ScriptProperties: ${e}`);
      }
    } else {
      Logger.log("Failed to send test poll.");
    }
}

/**
 * MANUAL: Clears all poll-related properties from ScriptProperties.
 * Useful for resetting state during testing
 */
function clearAllPollProperties() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const properties = scriptProperties.getProperties();
  let deletedCount = 0;
  for (const key in properties) {
    if (key.startsWith(POLL_PROPERTY_PREFIX)) {
      scriptProperties.deleteProperty(key);
      deletedCount++;
      Logger.log(`Deleted property: ${key}`);
    }
  }
  Logger.log(`Cleared ${deletedCount} poll properties.`);
  if (deletedCount > 0) {
    sendTelegramMessage(getTargetGroupChatId, MESSAGES.infoStateReset(deletedCount));
  } else {
     Logger.log("No poll properties found to clear.");
  }
}
