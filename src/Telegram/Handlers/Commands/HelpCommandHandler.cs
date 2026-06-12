using Telegram.Bot;
using Telegram.Bot.Types;
using TelegramBot.Configuration;

namespace TelegramBot.Telegram.Handlers.Commands;

public class HelpCommandHandler : ICommandHandler
{
    private readonly ITelegramBotClient _bot;
    private readonly MessageChainManager _chainManager;
    private readonly IConfigManager _configManager;
    private readonly ILogger<HelpCommandHandler> _logger;

    public HelpCommandHandler(
        ITelegramBotClient bot,
        MessageChainManager chainManager,
        IConfigManager configManager,
        ILogger<HelpCommandHandler> logger)
    {
        _bot = bot;
        _chainManager = chainManager;
        _configManager = configManager;
        _logger = logger;
    }

    public bool CanHandle(string command) => command is "/help" or "/start";

    public async Task HandleAsync(Update update)
    {
        _logger.LogInformation("Handling help command");
        var message = await _bot.SendMessage(
            update.Message.Chat.Id,
            "Довідка:\n" +
            "Чат бот має допомогти врегулювати використання майданчиком\n" +
            "/book для бронювання. \n" +
            "/cancel для скасування бронювання. \n" +
            "/register для реєстрації/оновлення емейла використовуйте \n" +
            "\n\n" +
            "Банка на підтримку розробки, сервісу і нервів:\n" +
            "https://send.monobank.ua/jar/39TTdiTzTS"
        );
        _chainManager.CreateChain(message.MessageId, update.Message.MessageId);
    }
}
