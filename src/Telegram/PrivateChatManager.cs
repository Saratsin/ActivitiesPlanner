using System.Text.RegularExpressions;
using Microsoft.Extensions.Caching.Memory;
using Newtonsoft.Json;
using Telegram.Bot;
using Telegram.Bot.Types;
using Telegram.Bot.Types.Enums;
using Telegram.Bot.Types.ReplyMarkups;
using TelegramBot.Calendar;
using TelegramBot.Configuration;
using TelegramBot.Core;
using TelegramBot.Exceptions;
using TelegramBot.Extensions;

namespace TelegramBot.Telegram;

public class PrivateChatManager
{
    private const string _checkMark = "✅";

    private static readonly Regex EmailRegex =
        new(
            @"^(([^<>()[\]\\,;:\s@']+(\.[^<>()[\]\\,;:\s@']\s)*)|.('.+'))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$");

    private readonly CalendarManager _calendarManager; // CalendarManager is a mock class
    private readonly MessageChainManager _chainManager;
    private readonly IConfigManager _configManager;
    private readonly ILogger<PrivateChatManager> _logger;
    private readonly IMemoryCache _memoryCache;
    private readonly ITelegramBotClient _telegramBot;
    private readonly MainGroupChat _mainGroupChat;
    private int _pullOffset;

    public PrivateChatManager(
        IConfigManager configManager,
        CalendarManager calendarManager,
        ITelegramBotClient telegramBot,
        MainGroupChat mainGroupChat,
        ILogger<PrivateChatManager> logger,
        IMemoryCache memoryCache)
    {
        _configManager = configManager;
        _calendarManager = calendarManager;
        _telegramBot = telegramBot;
        _mainGroupChat = mainGroupChat;
        _logger = logger;
        _memoryCache = memoryCache;
        _chainManager = new MessageChainManager(_memoryCache);
        int.TryParse(_configManager.GetProperty("PULL_OFFSET"), out _pullOffset);
    }

    public async Task SetupMenu()
    {
        var commands = new List<BotCommand>
        {
            new("register", "Зареєструватися"),
            new("book", "Забронювати"),
            new("cancel", "Скасувати бронь"),
            new("help", "Допомога")
        };
        await _telegramBot.SetMyCommands(commands, BotCommandScope.AllPrivateChats());
    }

    public async Task PollUpdates(int timeoutSeconds = 5)
    {
        try
        {
            var updates = await _telegramBot.GetUpdates(_pullOffset, 100, timeoutSeconds);

            if (updates.Length == 0)
            {
                _logger.LogInformation("No updates received or error occurred.");
                return;
            }

            await ProcessUpdates(updates);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing updates");
        }
    }

    private async Task ProcessUpdates(Update[] updates)
    {
        foreach (var update in updates) await ProcessUpdate(update);
        _pullOffset = updates.Last().Id + 1;
        _configManager.SetProperty("PULL_OFFSET", _pullOffset.ToString());
    }

    public async Task ProcessUpdate(Update update)
    {
        try
        {
            var updateLogData = JsonConvert.SerializeObject(update, JsonSetting.Intended);
            var message = update?.Message ?? update?.CallbackQuery?.Message;
            var chatType = message?.Chat?.Type;
            if (chatType != ChatType.Private) return;

            // TODO Add validations for user update 
            if (!await ValidateUserAsync(message)) 
                return;

            _logger.LogInformation($"Received update {updateLogData}");

            if (update.Message != null)
            {
                if (string.IsNullOrEmpty(message.Text))
                {
                    _logger.LogInformation($"Received message without text from {message.From?.Username}");
                    return;
                }

                _logger.LogInformation($"Received message: {message.Text} from {message.From?.Username}");
                if (message.Text.StartsWith("/"))
                    await HandleCommand(update);
                else if (message.Text.Contains("@"))
                    await HandleEmailMessage(message);
            }
            else if (update.CallbackQuery != null)
            {
                var callbackQuery = update.CallbackQuery;
                _logger.LogInformation(
                    $"Received callback query: {callbackQuery.Data} from {callbackQuery.From?.Username}");
                await HandleCallbackQuery(callbackQuery);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing update update: {Update}",
                JsonConvert.SerializeObject(update, JsonSetting.Intended));
            await NotifyAdmins(ex);
            await SendMessageToUser(update);
        }
    }

    private async Task<bool> ValidateUserAsync(Message message)
    {
        if (message.From?.IsBot is true && message.From.Username != _configManager.GetBotName())
            return false;
        
        // 1) No username
        if (message.Chat.Username is null)
        {
            await _telegramBot.SendMessage(message.Chat.Id,
                "Щоб забронювати майданчик, треба створити ім'я користувача\r\n" +
                "https://www.youtube.com/watch?v=Q-iZWJ7IwZs");
            return false;
        }
        
        // 2) Not in group channel
        var isInGroupChat = await _mainGroupChat.IsInGroupChat(message.From.Id);
        if (!isInGroupChat)
        {
            await _telegramBot.SendMessage(message.Chat.Id,
                "Вас нема в чаті спортмайданчику або вас забанили");
            return false;
        }
        
        // 3) TODO Banned
        
        
        return true;
    }

    private async Task SendMessageToUser(Update update)
    {
        try
        {
            var message = update?.Message ?? update?.CallbackQuery?.Message;
            if (message == null)
                return;

            await _telegramBot.SendMessage(message.Chat.Id, "Сталася помилка, вибачте за незручності");
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Error during user error notification");
        }
    }

    private async Task NotifyAdmins(Exception exception)
    {
        try
        {
            var adminsChat = _configManager.GetAdminsChats();
            foreach (var chatId in adminsChat) await _telegramBot.SendMessage(chatId, $"Error: {exception.Message}");
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Error during admins notification");
        }
    }

    private async Task HandleCommand(Update update)
    {
        Message createdMessage = null;
        switch (update.Message.Text)
        {
            case "/book":
                _logger.LogInformation("Handling book command");
                createdMessage = await _telegramBot.SendMessage(
                    update.Message.Chat.Id,
                    "Оберіть активність:",
                    replyMarkup: new InlineKeyboardMarkup(GetAvailableActivities(null))
                );
                break;
            case "/help":
            case "/start":
                _logger.LogInformation("Handling help command");
                createdMessage = await _telegramBot.SendMessage(
                    update.Message.Chat.Id,
                    "Довідка: використовуйте /book для бронювання.\nДля реєстрації/оновлення емейла використовуйте /register."
                );
                break;
            case "/register":
                _logger.LogInformation("Handling register command");
                createdMessage = await _telegramBot.SendMessage(
                    update.Message.Chat.Id,
                    "Будь ласка, надішліть ваш емейл для реєстрації приєднання до календаря."
                );
                break;
            case "/cancel":
                await CancelBooking(update);
                break;
            default:
                _logger.LogInformation($"Unknown command: {update.Message.Text}");
                createdMessage = await _telegramBot.SendMessage(
                    update.Message.Chat.Id,
                    "Невідома команда. Спробуйте /help."
                );
                break;
        }

        if (createdMessage != null)
            _chainManager.CreateChain(createdMessage.MessageId, update.Message.MessageId);
    }

    private async Task HandleEmailMessage(Message message)
    {
        if (!EmailRegex.IsMatch(message.Text))
        {
            await _telegramBot.SendMessage(message.Chat.Id,
                $"Не вірно введений емейл {message.Text}");
        }
        else
        {
            await _telegramBot.UnpinAllChatMessages(message.Chat.Id);

            _logger.LogInformation($"Email detected: {message.Text}");
            _memoryCache.CreateEntry(message.Chat.Username).Value = message.Text;

            await _telegramBot.PinChatMessage(message.Chat.Id, message.MessageId);
            await _telegramBot.SendMessage(message.Chat.Id,
                $"Ваш емейл {message.Text} успішно зареєстровано. Дякуємо!");
        }
    }

    private async Task CancelBooking(Update update)
    {
        _logger.LogInformation("Handling cancel command");
        var userName = update.Message.Chat.Username;
        var buttons = new List<List<InlineKeyboardButton>>();
        await foreach (var userTimeSlot in _calendarManager.GetUserBookingAsync(userName))
        {
            var day = userTimeSlot.Start.Date.ToString("dd-MM-yy");
            var time = $"{userTimeSlot.Start:hh:mm}-{userTimeSlot.End:hh:mm}";
            var text = $"{userTimeSlot.Summary} {day} {time}";
            var callbackDataOrUrl = EventButtonData.FromEventId(userTimeSlot.EventId).ToJson();
            buttons.Add([new InlineKeyboardButton(text, callbackDataOrUrl)]);
        }

        if (buttons.Count == 0)
        {
            await _telegramBot.SendMessage(
                update.Message.Chat.Id,
                "Нема чого скасовувати"
            );
            return;
        }

        buttons.Add([new InlineKeyboardButton("Підтвердити скасування", new ConfirmCancelButtonData().ToJson())]);
        buttons.Add([new InlineKeyboardButton("Не зараз", "cancel")]);

        var createdMessage = await _telegramBot.SendMessage(
            update.Message.Chat.Id,
            "Будь ласка, Оберіть слоти які ви хочете скасувати:.", replyMarkup: new InlineKeyboardMarkup(buttons)
        );

        _chainManager.CreateChain(createdMessage.MessageId, update.Message.MessageId);
    }

    private async Task HandleCallbackQuery(CallbackQuery update)
    {
        _logger.LogInformation($"Handling callback query: {update.Data}");

        if (update.Data == "cancel")
        {
            await DeleteMessage(update.Message.Chat.Id, update.Message.MessageId);
            return;
        }

        var buttonData = JsonConvert.DeserializeObject<ButtonData>(update.Data);

        switch (buttonData.Type)
        {
            case "SelectActivity":
                await HandleActivitySelection(update);
                break;
            case "SelectDate":
                await HandleSelectDate(update);
                break;
            case "SelectTime":
                await HandleSelectTime(update);
                break;
            case "Confirm":
                await HandleConfirmTimeSlotsButton(update);
                break;
            case "ConfirmCancel":
                await HandleConfirmCancelButton(update);
                break;
            case "SelectEvent":
                await HandleSelectTime(update);
                break;
            default:
                _logger.LogInformation($"Handling unknown callback query data: {update.Data}");
                break;
        }
    }

    private async Task HandleActivitySelection(CallbackQuery update)
    {
        var buttonData = JsonConvert.DeserializeObject<ButtonData>(update.Data);
        var message = await _telegramBot.SendMessage(
            update.Message.Chat.Id,
            "Оберіть дату та час для бронювання:",
            replyMarkup: new InlineKeyboardMarkup { InlineKeyboard = await GetAvailableDates(buttonData) }
        );
        _chainManager.CreateChain(message.MessageId, update.Message.MessageId);
    }

    private async Task HandleConfirmTimeSlotsButton(CallbackQuery update)
    {
        var data = JsonConvert.DeserializeObject<ButtonData>(update.Data);
        var replyKeyboard = update.Message.ReplyMarkup;
        var selectedTimeSlots = new List<string>();
        var timeSlots = new List<TimeSlot>();

        foreach (var row in replyKeyboard.InlineKeyboard)
        foreach (var button in row)
            if (button.Text.Contains(_checkMark))
            {
                var selectedButton = JsonConvert.DeserializeObject<ButtonData>(button.CallbackData);
                selectedTimeSlots.Add($"{selectedButton.Start}-{selectedButton.End}");
                timeSlots.Add(new TimeSlot
                    { Start = TimeOnly.Parse(selectedButton.Start), End = TimeOnly.Parse(selectedButton.End) });
            }

        var mergedTimeSlots = Utils.MergeTimeSlots(selectedTimeSlots);
        var timeSlotsText = mergedTimeSlots.Count > 0
            ? string.Join("\r\n", mergedTimeSlots.Select(slot => slot.ToView()))
            : "Час не обрано";

        _logger.LogInformation($"Selected time slots: {timeSlotsText}");

        var activity = Activities.All[data.Activity] ?? "Інше";

        var chat = update.Message.Chat;
        if (mergedTimeSlots.Any())
        {
            if (!_memoryCache.TryGetValue(chat.Username, out string email))
            {
                var chatInfo = await _telegramBot.GetChat(chat.Id);
                email = chatInfo.PinnedMessage?.Text;
            }

            var date = DateOnly.Parse(data.Date);
            
            try
            {
                await _calendarManager.BookSlots(chat.Username, email, activity, date, timeSlots);
            }
            catch (CalendarBookingRaceConditionException)
            {
                await RebuildTimeSlotsKeyboard(update.Message.Chat.Id, update.Message.MessageId, data.Date, data.Activity);
                await _telegramBot.SendMessage(chat.Id, $"Нажаль, вже хтось забронював цей час швидше. Спробуйте ще");
                return;
            }
            
            await _telegramBot.SendMessage(
                chat.Id,
                $"Ви забронювали на {data.Date} під {activity}: {timeSlotsText} \nДякуємо за бронювання!");
        }
        else
        {
            await _telegramBot.SendMessage(
                chat.Id,
                $"Нажаль вже все заброньовано {data.Date}");
        }

        await DeleteMessage(chat.Id, update.Message.MessageId);
    }

    private async Task HandleConfirmCancelButton(CallbackQuery update)
    {
        var replyKeyboard = update.Message.ReplyMarkup;
        var selectedEvents = new List<string>();
        var selectedButtonsTexts = new List<string>();
        
        foreach (var row in replyKeyboard.InlineKeyboard)
        foreach (var button in row)
            if (button.Text.Contains(_checkMark))
            {
                var selectedButton = JsonConvert.DeserializeObject<EventButtonData>(button.CallbackData);
                selectedEvents.Add(selectedButton.EventId);
                selectedButtonsTexts.Add(button.Text.Replace(_checkMark, ""));
            }

        await _calendarManager.CancelEvents(selectedEvents);

        await _mainGroupChat.NotifyAsync($"Cкасовано бронювання:\r\n{string.Join("\r\n",selectedButtonsTexts)}");

        await DeleteMessage(update.Message.Chat.Id, update.Message.MessageId);
    }

    private async Task DeleteMessage(long chatId, int messageId)
    {
        var chain = _chainManager.GetChain(messageId).Distinct();
        await chain.Foreach(async chainMessageId =>
        {
            try
            {
                await _telegramBot.DeleteMessage(chatId, chainMessageId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting message");
            }
            finally
            {
                _chainManager.Remove(chainMessageId);
            }
        });
    }

    private async Task HandleSelectTime(CallbackQuery update)
    {
        var replyKeyboard = update.Message.ReplyMarkup;

        foreach (var row in replyKeyboard.InlineKeyboard)
        foreach (var button in row)
            if (button.CallbackData == update.Data)
            {
                if (!button.Text.Contains(_checkMark))
                    button.Text = _checkMark + button.Text;
                else
                    button.Text = button.Text.Replace(_checkMark, "");
            }

        await _telegramBot.EditMessageReplyMarkup(
            update.Message.Chat.Id,
            update.Message.MessageId,
            new InlineKeyboardMarkup { InlineKeyboard = replyKeyboard.InlineKeyboard }
        );
    }

    private async Task HandleSelectDate(CallbackQuery update)
    {
        var data = JsonConvert.DeserializeObject<ButtonData>(update.Data);
        var date = data.Date;
        var activity = data.Activity;
        _logger.LogInformation($"Booking date: {date}");
        var createdMessage = await _telegramBot.SendMessage(
            update.Message.Chat.Id,
            $"Ви обрали дату: {date}. Будь ласка, оберіть час.",
            replyMarkup: new InlineKeyboardMarkup { InlineKeyboard = await GetDayTimeSlotsButtons(date, activity) }
        );

        _chainManager.CreateChain(createdMessage.MessageId, update.Message.MessageId);
    }

    private async Task<List<List<InlineKeyboardButton>>> GetAvailableDates(ButtonData parentData)
    {
        var buttons = new List<List<InlineKeyboardButton>>();
        var calendar = await _calendarManager.GetCalendar();
        var availableDays = calendar.GetDaysWithEmptySlots();
        foreach (var day in availableDays)
        {
            var buttonDate = day.ToString("yyyy-MM-dd");
            var dayName = Utils.GetUkrainianDayOfWeek(day.DayOfWeek);
            buttons.Add([
                new InlineKeyboardButton
                {
                    Text = $"{buttonDate} ({dayName})", CallbackData = ButtonData.FromDate(parentData, day).ToJson()
                }
            ]);
        }

        buttons.Add([new InlineKeyboardButton { Text = "Скасувати", CallbackData = "cancel" }]);
        return buttons;
    }

    private List<List<InlineKeyboardButton>> GetAvailableActivities(ButtonData parentData)
    {
        return Activities.All.Select((t, i) => (List<InlineKeyboardButton>)
                         [
                             new InlineKeyboardButton
                                 { Text = t, CallbackData = ButtonData.FromActivity(parentData, i).ToJson() }
                         ])
                         .ToList();
    }

    
    private async Task RebuildTimeSlotsKeyboard(long chatId, int messageId, string dateView, int activity)
    {
        var inlineKeyboardMarkup = new InlineKeyboardMarkup { InlineKeyboard = await GetDayTimeSlotsButtons(dateView, activity) };
        await _telegramBot.EditMessageReplyMarkup(chatId, messageId, inlineKeyboardMarkup);
    }
    
    private async Task<List<List<InlineKeyboardButton>>> GetDayTimeSlotsButtons(string dateView, int activity)
    {
        _logger.LogInformation($"Getting time slots for date: {dateView}");

        var date = DateTime.Parse(dateView);
        var buttons = new List<List<InlineKeyboardButton>>();
        var calendar = await _calendarManager.GetCalendar();
        var emptySlots = calendar.GetEmptySlots(DateOnly.FromDateTime(date));

        foreach (var emptySlot in emptySlots)
            buttons.Add([
                new InlineKeyboardButton(emptySlot.ToView(),
                    GetTimeSlotButtonData(emptySlot.Start, emptySlot.End).ToJson())
            ]);

        buttons.Add([
            new InlineKeyboardButton { Text = "Підтвердити", CallbackData = new ConfirmButtonData(dateView, activity).ToJson() }
        ]);
        buttons.Add([new InlineKeyboardButton { Text = "Скасувати", CallbackData = "cancel" }]);
        return buttons;
    }

    private ButtonData GetTimeSlotButtonData(TimeOnly from, TimeOnly to)
    {
        return ButtonData.FromTime(from, to);
    }

    public async Task SetupWebhook(string url)
    {
        var allowedUpdates = new[] { UpdateType.Message, UpdateType.CallbackQuery, UpdateType.InlineQuery };
        var webhookSecret = _configManager.GetTelegramWebhookSecret();
        await _telegramBot.SetWebhook(url, allowedUpdates: allowedUpdates, secretToken: webhookSecret);
    }
}