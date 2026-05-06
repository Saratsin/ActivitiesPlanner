using Microsoft.Extensions.Caching.Memory;
using Newtonsoft.Json;
using Telegram.Bot;
using Telegram.Bot.Types;
using Telegram.Bot.Types.ReplyMarkups;
using TelegramBot.Calendar;
using TelegramBot.Configuration;
using TelegramBot.Core;
using TelegramBot.Exceptions;
using TelegramBot.Telegram;
using TelegramBot.Telegram.Handlers;

namespace TelegramBot.Telegram.Handlers.Callbacks;

public class ConfirmBookingCallbackHandler : ICallbackQueryHandler
{
    private const string CheckMark = "✅";

    private readonly ITelegramBotClient _bot;
    private readonly CalendarManager _calendarManager;
    private readonly IMemoryCache _memoryCache;
    private readonly MessageDeleter _messageDeleter;
    private readonly BookingKeyboardBuilder _keyboardBuilder;
    private readonly ILogger<ConfirmBookingCallbackHandler> _logger;
    private readonly IConfigManager _configManager;

    public ConfirmBookingCallbackHandler(
        ITelegramBotClient bot,
        CalendarManager calendarManager,
        IMemoryCache memoryCache,
        MessageDeleter messageDeleter,
        BookingKeyboardBuilder keyboardBuilder,
        IConfigManager configManager, 
        ILogger<ConfirmBookingCallbackHandler> logger)
    {
        _bot = bot;
        _calendarManager = calendarManager;
        _memoryCache = memoryCache;
        _messageDeleter = messageDeleter;
        _keyboardBuilder = keyboardBuilder;
        _logger = logger;
        _configManager = configManager;
    }

    public bool CanHandle(string type) => type == "Confirm";

    public async Task HandleAsync(CallbackQuery callbackQuery)
    {
        var data = JsonConvert.DeserializeObject<ButtonData>(callbackQuery.Data);
        var replyKeyboard = callbackQuery.Message.ReplyMarkup;
        var selectedTimeSlots = new List<string>();
        var timeSlots = new List<TimeSlot>();

        foreach (var row in replyKeyboard.InlineKeyboard)
        foreach (var button in row)
            if (button.Text.Contains(CheckMark))
            {
                var selectedButton = JsonConvert.DeserializeObject<ButtonData>(button.CallbackData);
                selectedTimeSlots.Add($"{selectedButton.Start}-{selectedButton.End}");
                timeSlots.Add(new TimeSlot
                {
                    Start = TimeOnly.Parse(selectedButton.Start),
                    End = TimeOnly.Parse(selectedButton.End)
                });
            }

        var mergedTimeSlots = Utils.MergeTimeSlots(selectedTimeSlots);
        var timeSlotsText = mergedTimeSlots.Count > 0
            ? string.Join("\r\n", mergedTimeSlots.Select(slot => slot.ToView()))
            : "Час не обрано";

        _logger.LogInformation($"Selected time slots: {timeSlotsText}");

        var activity = Activities.All[data.Activity] ?? "Інше";
        var chat = callbackQuery.Message.Chat;

        if (mergedTimeSlots.Any())
        {
            var userName = chat.Username;
            var used = await _calendarManager.GetUsedTime(userName);
            var maxAvailableTime = _configManager.GetCalendarConfig().MaxAvailableTime;
            var booked = mergedTimeSlots.Aggregate(TimeSpan.Zero, (current, timeSlot) => current + (timeSlot.End - timeSlot.Start));

            if (used + booked > maxAvailableTime)
            {
                await _bot.SendMessage(
                    chat.Id,
                    $"Превищенно ліміт на одну особу. Ви вже забронювали {used:g} і намагаєтесь забронювати {booked:g}." +
                    $"\nМаксимальний ліміт {maxAvailableTime:g}." +
                    $"\nСпочатку скасуйте інші бронювання або оберіть меншу кількість"
                );
                
                return;
            }
            
            if (!_memoryCache.TryGetValue(userName, out string email))
            {
                var chatInfo = await _bot.GetChat(chat.Id);
                email = chatInfo.PinnedMessage?.Text;
            }
            // TODO read from DB if exists
            
            var date = DateOnly.Parse(data.Date);

            try
            {
                await _calendarManager.BookSlots(userName, email, activity, date, timeSlots);
            }
            catch (CalendarBookingRaceConditionException)
            {
                await RebuildTimeSlotsKeyboard(chat.Id, callbackQuery.Message.MessageId, data.Date, data.Activity);
                await _bot.SendMessage(chat.Id, "Нажаль, вже хтось забронював цей час швидше. Спробуйте ще");
                return;
            }

            await _bot.SendMessage(
                chat.Id,
                $"Ви забронювали на {data.Date} під {activity}: {timeSlotsText} \nДякуємо за бронювання!\n Не забувайте скасовувати бронювання заздалегіть, якщо не виходить прийти.");
        }
        else
        {
            await _bot.SendMessage(chat.Id, $"Нажаль вже все заброньовано {data.Date}");
        }

        await _messageDeleter.DeleteAsync(chat.Id, callbackQuery.Message.MessageId);
    }

    private async Task RebuildTimeSlotsKeyboard(long chatId, int messageId, string dateView, int activity)
    {
        var markup = new InlineKeyboardMarkup
        {
            InlineKeyboard = await _keyboardBuilder.GetDayTimeSlotsButtons(dateView, activity)
        };
        await _bot.EditMessageReplyMarkup(chatId, messageId, markup);
    }
}
