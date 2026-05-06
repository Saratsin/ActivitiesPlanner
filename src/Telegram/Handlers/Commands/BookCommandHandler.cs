using Telegram.Bot;
using Telegram.Bot.Types;
using Telegram.Bot.Types.ReplyMarkups;
using TelegramBot.Calendar;
using TelegramBot.Configuration;

namespace TelegramBot.Telegram.Handlers.Commands;

public class BookCommandHandler : ICommandHandler
{
    private readonly ITelegramBotClient _bot;
    private readonly MessageChainManager _chainManager;
    private readonly BookingKeyboardBuilder _keyboardBuilder;
    private readonly CalendarManager _calendarManager;
    private readonly IConfigManager _configManager;
    private readonly ILogger<BookCommandHandler> _logger;

    public BookCommandHandler(
        ITelegramBotClient bot,
        MessageChainManager chainManager,
        BookingKeyboardBuilder keyboardBuilder,
        CalendarManager calendarManager,
        IConfigManager configManager,
        ILogger<BookCommandHandler> logger)
    {
        _bot = bot;
        _chainManager = chainManager;
        _keyboardBuilder = keyboardBuilder;
        _calendarManager = calendarManager;
        _configManager = configManager;
        _logger = logger;
    }

    public bool CanHandle(string command) => command == "/book";

    public async Task HandleAsync(Update update)
    {
        _logger.LogInformation("Handling book command");

        var used = await _calendarManager.GetUsedTime(update.Message.Chat.Username);
        var maxAvailableTime = _configManager.GetCalendarConfig().MaxAvailableTime;
        if (used >= maxAvailableTime)
        {
            await _bot.SendMessage(
                update.Message.Chat.Id,
                $"Превищенно ліміт на одну особу. Ви вже забронювали {used:g}.\nМаксимальний ліміт {maxAvailableTime:g}.\nСпочатку скасуйте інші бронювання"
            );
            
            return;
        }
        
        var message = await _bot.SendMessage(
            update.Message.Chat.Id,
            "Оберіть активність:",
            replyMarkup: new InlineKeyboardMarkup(_keyboardBuilder.GetAvailableActivities(null))
        );
        _chainManager.CreateChain(message.MessageId, update.Message.MessageId);
    }
}
