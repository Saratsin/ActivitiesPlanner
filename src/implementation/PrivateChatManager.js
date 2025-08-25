class PrivateChatManager {
    constructor(configManager, telegramBot, calendarManager) {
        this.configManager = configManager;
        this.telegramBot = telegramBot;
        this.calendarManager = calendarManager;
        this.pullOffset = configManager.getProperty('PULL_OFFSET') ? parseInt(configManager.getProperty('PULL_OFFSET')) : 0;

    }

    setupMenu() {
        const commands = [
            { command: "register", description: "Зареєструватися" },
            { command: "book", description: "Забронювати" },
            { command: "help", description: "Допомога" }
        ];
        this.telegramBot.setMyCommands(commands);
    }

    pollUpdates(timeoutSeconds = 5) {
        const payload = {
            offset: this.pullOffset,
            limit: 100,
            timeout: timeoutSeconds
        };
        const updates = this.telegramBot.getUpdatesApi(payload);

        if (Array.isArray(updates) === false) {
            Utils.logError(`Error fetching updates: Not an array: ${updates}`);
            return;
        }

        if (!updates || updates.length === 0) {
            Utils.logInfo("No updates received or error occurred.");
            return;
        }

        try {
            this.processUpdates(updates);
        } catch (error) {
            Utils.logError(`Error processing updates: ${error}`);
            return;
        }
        finally {
            this.pullOffset = updates[updates.length - 1].update_id + 1;
            this.configManager.setProperty('PULL_OFFSET', this.pullOffset.toString());
        }
    }

    processUpdates(updates) {
        updates.forEach(update => {

            try {
                var updateLogData = JSON.stringify(update)

                if (update?.message?.chat?.type !== 'private' &&
                    update?.callback_query?.message?.chat?.type !== 'private') {

                    // Utils.logInfo(`Skipping undefined update ${updateLogData}`);
                    return;
                }

                // TODO remove to mamy logs. Only for testing
                Utils.logInfo(`Received update ${updateLogData}`);

                if (update.message) {
                    const message = update.message;
                    if (message.text === undefined) {
                        Utils.logInfo(`Received message without text from ${message.from.username}`);
                        return;
                    }

                    Utils.logInfo(`Received message: ${message.text} from ${message.from.username}`);
                    if (message.text.startsWith('/')) {
                        this.handleCommand(update);
                    }
                    if (message.text.includes('@')) {
                        this.handleEmailMessage(message);
                    }
                } else if (update.callback_query) {
                    const callbackQuery = update.callback_query;
                    Utils.logInfo(`Received callback query: ${callbackQuery.data} from ${callbackQuery.from.username}`);
                    this.handleCallbackQuery(callbackQuery);
                }
            } catch (error) {
                Utils.logError(`Error processing update: Error: ${error}. Update: ${JSON.stringify(update)}`);
            }
        });
    }

    handleEmailMessage(message) {
        const EMAIL_REGEX = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if (message.text.match(EMAIL_REGEX)) {
            Utils.logInfo(`Email detected: ${message.text}`);
            // TODO: Handle email registration
            this.telegramBot.sendMessage(
                message.chat.id,
                `Ваш емейл ${message.text} успішно зареєстровано. Дякуємо!`
            );
        }
    }

    handleCommand(update) {
        switch (update.message.text) {
            case '/book':
                Utils.logInfo("Handling book command");
                this.telegramBot.sendMessage(
                    update.message.chat.id,
                    "Оберіть дату та час для бронювання:",
                    { inline_keyboard: this.getAvailableDates(null) }
                );
                break;
            case '/help':
            case '/start':
                Utils.logInfo("Handling help command");
                this.telegramBot.sendMessage(
                    update.message.chat.id,
                    "Довідка: використовуйте /book для бронювання.\nДля реєстрації/оновлення емейла використовуйте /register."
                );

                // TODO mark that user is writing email

                break;
            case '/register':
                Utils.logInfo("Handling register command");
                this.telegramBot.sendMessage(
                    update.message.chat.id,
                    "Будь ласка, надішліть ваш емейл для реєстрації приєднання до календаря."
                );
                break;
            default:
                Utils.logInfo(`Unknown command: ${update.message.text}`);
                this.telegramBot.sendMessage(
                    update.message.chat.id,
                    "Невідома команда. Спробуйте /help."
                );
        }
    }

    handleCallbackQuery(update) {
        Utils.logInfo(`Handling callback query: ${update.data}`);

        if (update.data === 'cancel') {
            this.telegramBot.deleteMessage(update.message.chat.id, update.message.message_id);
            return;
        }

        const buttonData = JSON.parse(update.data);
        if (buttonData.type === "SelectActivity") {
            this.handleSelectActivity(update);
        } else if (buttonData.type === "SelectDate") {
            this.handleSelectDate(update);
        } else if (buttonData.type === "SelectTime") {
            this.handleSelectTime(update);
        } else if (buttonData.type === "Confirm") {
            this.handleConfirmTimeSlotsButton(update);
        }
        else {
            Utils.logInfo(`Handling unknown callback query data: ${update.data}`);
        }
    }

    handleConfirmTimeSlotsButton(update) {
        var data = JSON.parse(update.data);
        var date = data.date;
        Utils.logInfo(`Confirmed booking for date: ${date}`);
        var replyKeyboard = update.message.reply_markup.inline_keyboard;
        var selectedTimeSlots = [];
        replyKeyboard.forEach(row => {
            row.forEach(button => {
                if (button.text.includes('✅')) {
                    var selectedButton = JSON.parse(button.callback_data);
                    selectedTimeSlots.push(selectedButton.start + '-' + selectedButton.end);
                }
            });
        });

        var mergedTimeSlots = Utils.mergeTimeSlots(date, selectedTimeSlots);
        var timeSlotsText = mergedTimeSlots.map(slot => {
            return this.getTimeSlotTimeString(slot.from, slot.to);
        });
        timeSlotsText = mergedTimeSlots.length > 0 ? `\r\n${timeSlotsText.join('\r\n')}` : 'Час не обрано';
        Utils.logInfo(`Selected time slots: ${timeSlotsText}`);

        this.telegramBot.sendMessage(
            update.message.chat.id,
            `Ви забронювали на ${date}: ${timeSlotsText} \nДякуємо за бронювання!`
        );

        this.telegramBot.deleteMessage(update.message.chat.id, update.message.message_id);
    }

    handleSelectTime(update) {
        var replyKeyboard = update.message.reply_markup.inline_keyboard;
        replyKeyboard.forEach(row => {
            row.forEach(button => {
                if (button.callback_data === update.data) {
                    if (!button.text.includes('✅')) {
                        button.text += '✅'; // Add checkmark to the selected button
                    } else {
                        button.text = button.text.replace('✅', ''); // Remove any existing checkmark
                    }
                }
            });
        });

        this.telegramBot.editMessageReplyMarkup(
            update.message.chat.id,
            update.message.message_id,
            { inline_keyboard: replyKeyboard }
        );
    }

    handleSelectDate(update) {
        var data = JSON.parse(update.data);
        const date = data.date;
        Utils.logInfo(`Booking date: ${date}`);
        this.telegramBot.sendMessage(
            update.message.chat.id,
            `Ви обрали дату: ${date}. Будь ласка, оберіть час.`,
            { inline_keyboard: this.getDayTimeSlotsButtons(data) }
        );
    }

    getAvailableDates(parentData) {
        let availableDates = [];
        const today = new Date();
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            var buttonDate = date.toISOString().split('T')[0]; // Format date as YYYY-MM-DD
            var dayName = Utils.getUkrainianDayOfWeek(date);
            availableDates.push([{ text: buttonDate + " (" + dayName + ")", callback_data: ButtonData.fromDate(parentData, date).toString() }]);
        }
        availableDates.push([{ text: "Скасувати", callback_data: "cancel" }]);
        return availableDates;
    }

    getAvailableActivities(parentData) {
        return [
            { text: "Футбол", callback_data: ButtonData.fromActivity(parentData, 'football').toString() },
            { text: "Баскетбол", callback_data: ButtonData.fromActivity(parentData, 'basketball').toString() },
            { text: "Теніс", callback_data: ButtonData.fromActivity(parentData, 'tennis').toString() },
            { text: "Волейбол", callback_data: ButtonData.fromActivity(parentData, 'volleyball').toString() },
            { text: "Бадмінтон", callback_data: ButtonData.fromActivity(parentData, 'badminton').toString() },
            { text: "Інше", callback_data: ButtonData.fromActivity(parentData, 'other').toString() },
            { text: "Скасувати", callback_data: "cancel" }
        ];
    }

    getDayTimeSlotsButtons(parentData) {
        Utils.logInfo(`Getting time slots for date: ${parentData?.date}`);
        const timeSlots = [];
        const startTime = new Date(parentData?.date + 'T09:00:00'); // Start at 9 AM
        const endTime = new Date(parentData?.date + 'T20:00:00');
        var current = startTime;
        while (current < endTime) {
            var nextDate = Utils.dateAdd(current, 'minute', 30);
            var view = this.getTimeSlotTimeString(current, nextDate);
            var data = this.getTimeSlotButtonData(parentData, current, nextDate);
            var serializedData = data.toString();

            // TODO remove
            Utils.logInfo(`Prepared data: ${serializedData}`);

            timeSlots.push([{ text: view, callback_data: serializedData }]);
            current = nextDate;
        }
        timeSlots.push([{ text: "Підтвердити", callback_data: new ConfirmButtonData(parentData).toString() }]);
        timeSlots.push([{ text: "Скасувати", callback_data: "cancel" }]);
        return timeSlots;
    }

    getTimeSlotTimeString(from, to) {
        return `${from.toLocaleTimeString('uk-UA').slice(0, 5)} - ${to.toLocaleTimeString('uk-UA').slice(0, 5)}`;
    }

    getTimeSlotButtonData(parentData, from, to) {
        return ButtonData.fromTime(parentData, from, to);
    }

}