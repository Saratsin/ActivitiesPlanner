using Telegram.Bot;
using Telegram.Bot.Types;

namespace TelegramBot.Telegram.Handlers.Commands;

public class HelpCommandHandler : ICommandHandler
{
    private readonly ITelegramBotClient _bot;
    private readonly MessageChainManager _chainManager;
    private readonly ILogger<HelpCommandHandler> _logger;

    public HelpCommandHandler(
        ITelegramBotClient bot,
        MessageChainManager chainManager,
        ILogger<HelpCommandHandler> logger)
    {
        _bot = bot;
        _chainManager = chainManager;
        _logger = logger;
    }

    public bool CanHandle(string command) => command is "/help" or "/start";

    public async Task HandleAsync(Update update)
    {
        _logger.LogInformation("Handling help command");
        var message = await _bot.SendMessage(
            update.Message.Chat.Id,
            "Довідка: \n" +
            "/book для бронювання. \n" +
            "/cancel для скасування бронювання. \n" +
            "/register для реєстрації/оновлення емейла використовуйте \n"
        );
        _chainManager.CreateChain(message.MessageId, update.Message.MessageId);
    }
}
