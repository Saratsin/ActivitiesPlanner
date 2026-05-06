using Newtonsoft.Json;
using Telegram.Bot;
using Telegram.Bot.Types;
using Telegram.Bot.Types.ReplyMarkups;

namespace TelegramBot.Telegram.Handlers.Callbacks;

public class SelectDateCallbackHandler : ICallbackQueryHandler
{
    private readonly ITelegramBotClient _bot;
    private readonly MessageChainManager _chainManager;
    private readonly BookingKeyboardBuilder _keyboardBuilder;
    private readonly ILogger<SelectDateCallbackHandler> _logger;

    public SelectDateCallbackHandler(
        ITelegramBotClient bot,
        MessageChainManager chainManager,
        BookingKeyboardBuilder keyboardBuilder,
        ILogger<SelectDateCallbackHandler> logger)
    {
        _bot = bot;
        _chainManager = chainManager;
        _keyboardBuilder = keyboardBuilder;
        _logger = logger;
    }

    public bool CanHandle(string type) => type == "SelectDate";

    public async Task HandleAsync(CallbackQuery callbackQuery)
    {
        var data = JsonConvert.DeserializeObject<ButtonData>(callbackQuery.Data);
        _logger.LogInformation($"Booking date: {data.Date}");
        var message = await _bot.SendMessage(
            callbackQuery.Message.Chat.Id,
            $"Ви обрали дату: {data.Date}. Будь ласка, оберіть час.",
            replyMarkup: new InlineKeyboardMarkup
            {
                InlineKeyboard = await _keyboardBuilder.GetDayTimeSlotsButtons(data.Date, data.Activity)
            }
        );
        _chainManager.CreateChain(message.MessageId, callbackQuery.Message.MessageId);
    }
}
