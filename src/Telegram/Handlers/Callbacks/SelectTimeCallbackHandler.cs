using Telegram.Bot;
using Telegram.Bot.Types;
using Telegram.Bot.Types.ReplyMarkups;

namespace TelegramBot.Telegram.Handlers.Callbacks;

public class SelectTimeCallbackHandler : ICallbackQueryHandler
{
    private const string CheckMark = "✅";

    private readonly ITelegramBotClient _bot;

    public SelectTimeCallbackHandler(ITelegramBotClient bot)
    {
        _bot = bot;
    }

    public bool CanHandle(string type) => type is "SelectTime" or "SelectEvent";

    public async Task HandleAsync(CallbackQuery callbackQuery)
    {
        var replyKeyboard = callbackQuery.Message.ReplyMarkup;

        foreach (var row in replyKeyboard.InlineKeyboard)
        foreach (var button in row)
            if (button.CallbackData == callbackQuery.Data)
            {
                if (!button.Text.Contains(CheckMark))
                    button.Text = CheckMark + button.Text;
                else
                    button.Text = button.Text.Replace(CheckMark, "");
            }

        await _bot.EditMessageReplyMarkup(
            callbackQuery.Message.Chat.Id,
            callbackQuery.Message.MessageId,
            new InlineKeyboardMarkup { InlineKeyboard = replyKeyboard.InlineKeyboard }
        );
    }
}
