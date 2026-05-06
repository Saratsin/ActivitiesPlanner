using Telegram.Bot.Types;

namespace TelegramBot.Telegram.Handlers;

public interface ICommandHandler
{
    bool CanHandle(string command);
    Task HandleAsync(Update update);
}
