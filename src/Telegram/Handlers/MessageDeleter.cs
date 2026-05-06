using Telegram.Bot;
using TelegramBot.Extensions;

namespace TelegramBot.Telegram.Handlers;

public class MessageDeleter
{
    private readonly ITelegramBotClient _bot;
    private readonly MessageChainManager _chainManager;
    private readonly ILogger<MessageDeleter> _logger;

    public MessageDeleter(ITelegramBotClient bot, MessageChainManager chainManager, ILogger<MessageDeleter> logger)
    {
        _bot = bot;
        _chainManager = chainManager;
        _logger = logger;
    }

    public async Task DeleteAsync(long chatId, int messageId)
    {
        var chain = _chainManager.GetChain(messageId).Distinct();
        await chain.Foreach(async chainMessageId =>
        {
            try
            {
                await _bot.DeleteMessage(chatId, chainMessageId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting message");
            }
            finally
            {
                _chainManager.Remove(chainMessageId);
            }
        });
    }
}
