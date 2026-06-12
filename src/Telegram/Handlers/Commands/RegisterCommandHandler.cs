using Telegram.Bot;
using Telegram.Bot.Types;

namespace TelegramBot.Telegram.Handlers.Commands;

public class RegisterCommandHandler : ICommandHandler
{
    private readonly ITelegramBotClient _bot;
    private readonly MessageChainManager _chainManager;
    private readonly ILogger<RegisterCommandHandler> _logger;

    public RegisterCommandHandler(
        ITelegramBotClient bot,
        MessageChainManager chainManager,
        ILogger<RegisterCommandHandler> logger)
    {
        _bot = bot;
        _chainManager = chainManager;
        _logger = logger;
    }

    public bool CanHandle(string command) => command == "/register";

    public async Task HandleAsync(Update update)
    {
        _logger.LogInformation("Handling register command");
        var message = await _bot.SendMessage(
            update.Message.Chat.Id,
            "Будь ласка, надішліть ваш емейл для реєстрації приєднання до календаря."
        );
        _chainManager.CreateChain(message.MessageId, update.Message.MessageId);
    }
}
