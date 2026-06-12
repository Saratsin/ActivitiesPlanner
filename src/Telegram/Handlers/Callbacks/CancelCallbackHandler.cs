using Telegram.Bot.Types;

namespace TelegramBot.Telegram.Handlers.Callbacks;

public class CancelCallbackHandler : ICallbackQueryHandler
{
    private readonly MessageDeleter _messageDeleter;

    public CancelCallbackHandler(MessageDeleter messageDeleter)
    {
        _messageDeleter = messageDeleter;
    }

    public bool CanHandle(string type) => type == "cancel";

    public Task HandleAsync(CallbackQuery callbackQuery)
        => _messageDeleter.DeleteAsync(callbackQuery.Message.Chat.Id, callbackQuery.Message.MessageId);
}
