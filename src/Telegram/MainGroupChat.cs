using Telegram.Bot;
using Telegram.Bot.Types.Enums;
using TelegramBot.Configuration;

namespace TelegramBot.Telegram;

public class MainGroupChat
{
    private readonly IConfigManager _configManager;
    private readonly ITelegramBotClient _telegramBot;
    private readonly ILogger<MainGroupChat> _logger;

    public MainGroupChat(IConfigManager configManager,  
        ITelegramBotClient telegramBot,
        ILogger<MainGroupChat> logger)
    {
        _configManager = configManager;
        _telegramBot = telegramBot;
        _logger = logger;
    }

    public async Task<bool> IsInGroupChat(long userId)
    {
        var mainChatId = _configManager.GetMainChatId();
        var chatMember = await _telegramBot.GetChatMember(chatId: mainChatId, userId: userId);
        if (!chatMember.IsInChat) 
            return false;

        var isBanned = chatMember.Status is ChatMemberStatus.Left or ChatMemberStatus.Kicked or ChatMemberStatus.Restricted;
        return !isBanned;
    }

    public async Task NotifyAsync(string message)
    {
        var mainChatId = _configManager.GetMainChatId();
        await _telegramBot.SendMessage(mainChatId, message);
    }
}