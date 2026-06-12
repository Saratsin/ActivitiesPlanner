using Telegram.Bot;
using Telegram.Bot.Types;
using Telegram.Bot.Types.ReplyMarkups;
using TelegramBot.Calendar;

namespace TelegramBot.Telegram.Handlers.Commands;

public class CancelCommandHandler : ICommandHandler
{
    private readonly ITelegramBotClient _bot;
    private readonly CalendarManager _calendarManager;
    private readonly MessageChainManager _chainManager;
    private readonly ILogger<CancelCommandHandler> _logger;

    public CancelCommandHandler(
        ITelegramBotClient bot,
        CalendarManager calendarManager,
        MessageChainManager chainManager,
        ILogger<CancelCommandHandler> logger)
    {
        _bot = bot;
        _calendarManager = calendarManager;
        _chainManager = chainManager;
        _logger = logger;
    }

    public bool CanHandle(string command) => command == "/cancel";

    public async Task HandleAsync(Update update)
    {
        _logger.LogInformation("Handling cancel command");
        var userName = update.Message.Chat.Username;
        var buttons = new List<List<InlineKeyboardButton>>();
        await foreach (var userTimeSlot in _calendarManager.GetUserBookingAsync(userName))
        {
            var day = userTimeSlot.Start.Date.ToString("dd-MM-yy");
            var time = $"{userTimeSlot.Start:HH:mm}-{userTimeSlot.End:HH:mm}";
            var text = $"{userTimeSlot.Summary} {day} {time}";
            var callbackData = EventButtonData.FromEventId(userTimeSlot.EventId).ToJson();
            buttons.Add([new InlineKeyboardButton(text, callbackData)]);
        }

        if (buttons.Count == 0)
        {
            await _bot.SendMessage(update.Message.Chat.Id, "Нема чого скасовувати");
            return;
        }

        buttons.Add([new InlineKeyboardButton("Підтвердити скасування", new ConfirmCancelButtonData().ToJson())]);
        buttons.Add([new InlineKeyboardButton("Не зараз", "cancel")]);

        var createdMessage = await _bot.SendMessage(
            update.Message.Chat.Id,
            "Будь ласка, Оберіть слоти які ви хочете скасувати:.",
            replyMarkup: new InlineKeyboardMarkup(buttons)
        );
        _chainManager.CreateChain(createdMessage.MessageId, update.Message.MessageId);
    }
}
