using Microsoft.Extensions.Caching.Memory;

namespace TelegramBot.Telegram;

public class MessageChainManager
{
    private readonly IMemoryCache _memoryCache;

    public MessageChainManager(IMemoryCache memoryCache)
    {
        _memoryCache = memoryCache;
    }

    public void CreateChain(int current, int parent)
    {
        _memoryCache.Set(current, parent, DateTimeOffset.Now.AddHours(47));
    }

    public int[] GetChain(int messageId)
    {
        return GetChain(messageId, 0);
    }

    private int[] GetChain(int messageId, int recursionLevel)
    {
        if (recursionLevel > 10)
            return [messageId];

        if (!_memoryCache.TryGetValue(messageId, out int chain)) return [messageId];
        var nextChain = GetChain(chain, ++recursionLevel);
        return new[] { messageId }.Concat(nextChain).ToArray();
    }

    public void Remove(int chainMessageId)
    {
        _memoryCache.Remove(chainMessageId);
    }
}