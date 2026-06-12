using Telegram.Bot.Types;

namespace TelegramBot.Telegram.Handlers;

public interface ICallbackQueryHandler
{
    bool CanHandle(string type);
    Task HandleAsync(CallbackQuery callbackQuery);
}
