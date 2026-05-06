using Telegram.Bot;
using Telegram.Bot.Types;
using TelegramBot.Telegram;
using TelegramBot.Telegram.Handlers;

namespace TelegramBot.Telegram.Handlers.Commands;

public class UnknownCommandHandler : ICommandHandler
{
    private readonly ITelegramBotClient _bot;
    private readonly MessageChainManager _chainManager;
    private readonly ILogger<UnknownCommandHandler> _logger;

    public UnknownCommandHandler(
        ITelegramBotClient bot,
        MessageChainManager chainManager,
        ILogger<UnknownCommandHandler> logger)
    {
        _bot = bot;
        _chainManager = chainManager;
        _logger = logger;
    }

    public bool CanHandle(string command) => true;

    public async Task HandleAsync(Update update)
    {
        _logger.LogInformation($"Unknown command: {update.Message.Text}");
        var message = await _bot.SendMessage(
            update.Message.Chat.Id,
            "Невідома команда. Спробуйте /help."
        );
        _chainManager.CreateChain(message.MessageId, update.Message.MessageId);
    }
}
