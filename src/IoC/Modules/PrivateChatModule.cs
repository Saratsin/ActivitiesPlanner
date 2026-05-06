using TelegramBot.Telegram;

namespace TelegramBot.IoC.Modules;

public static class PrivateChatModule
{
    public static IServiceCollection AddPrivateChatModule(this IServiceCollection services)
    {
        services.AddTransient<PrivateChatManager>();
        return services;
    }
}