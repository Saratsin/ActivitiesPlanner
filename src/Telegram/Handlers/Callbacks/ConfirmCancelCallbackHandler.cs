using Newtonsoft.Json;
using Telegram.Bot.Types;
using TelegramBot.Calendar;
using TelegramBot.Telegram;
using TelegramBot.Telegram.Handlers;

namespace TelegramBot.Telegram.Handlers.Callbacks;

public class ConfirmCancelCallbackHandler : ICallbackQueryHandler
{
    private const string CheckMark = "✅";

    private readonly CalendarManager _calendarManager;
    private readonly MainGroupChat _mainGroupChat;
    private readonly MessageDeleter _messageDeleter;
    private readonly ILogger<ConfirmCancelCallbackHandler> _logger;

    public ConfirmCancelCallbackHandler(
        CalendarManager calendarManager,
        MainGroupChat mainGroupChat,
        MessageDeleter messageDeleter,
        ILogger<ConfirmCancelCallbackHandler> logger)
    {
        _calendarManager = calendarManager;
        _mainGroupChat = mainGroupChat;
        _messageDeleter = messageDeleter;
        _logger = logger;
    }

    public bool CanHandle(string type) => type == "ConfirmCancel";

    public async Task HandleAsync(CallbackQuery callbackQuery)
    {
        var replyKeyboard = callbackQuery.Message.ReplyMarkup;
        var selectedEvents = new List<string>();
        var selectedButtonsTexts = new List<string>();

        foreach (var row in replyKeyboard.InlineKeyboard)
        foreach (var button in row)
            if (button.Text.Contains(CheckMark))
            {
                var selectedButton = JsonConvert.DeserializeObject<EventButtonData>(button.CallbackData);
                selectedEvents.Add(selectedButton.EventId);
                selectedButtonsTexts.Add(button.Text.Replace(CheckMark, ""));
            }

        await _calendarManager.CancelEvents(selectedEvents);
        await _mainGroupChat.NotifyAsync($"Cкасовано бронювання:\r\n{string.Join("\r\n", selectedButtonsTexts)}");
        await _messageDeleter.DeleteAsync(callbackQuery.Message.Chat.Id, callbackQuery.Message.MessageId);
    }
}
