using Newtonsoft.Json;
using Telegram.Bot;
using Telegram.Bot.Types;
using Telegram.Bot.Types.ReplyMarkups;
using TelegramBot.Telegram;
using TelegramBot.Telegram.Handlers;

namespace TelegramBot.Telegram.Handlers.Callbacks;

public class SelectActivityCallbackHandler : ICallbackQueryHandler
{
    private readonly ITelegramBotClient _bot;
    private readonly MessageChainManager _chainManager;
    private readonly BookingKeyboardBuilder _keyboardBuilder;

    public SelectActivityCallbackHandler(
        ITelegramBotClient bot,
        MessageChainManager chainManager,
        BookingKeyboardBuilder keyboardBuilder)
    {
        _bot = bot;
        _chainManager = chainManager;
        _keyboardBuilder = keyboardBuilder;
    }

    public bool CanHandle(string type) => type == "SelectActivity";

    public async Task HandleAsync(CallbackQuery callbackQuery)
    {
        var buttonData = JsonConvert.DeserializeObject<ButtonData>(callbackQuery.Data);
        var message = await _bot.SendMessage(
            callbackQuery.Message.Chat.Id,
            "Оберіть дату та час для бронювання:",
            replyMarkup: new InlineKeyboardMarkup
            {
                InlineKeyboard = await _keyboardBuilder.GetAvailableDates(buttonData)
            }
        );
        _chainManager.CreateChain(message.MessageId, callbackQuery.Message.MessageId);
    }
}
