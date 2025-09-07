using Telegram.Bot;
using TelegramBot.Configuration;
using TelegramBot.Telegram;

namespace TelegramBot.IoC;

public static class Modules
{
    public static WebApplicationBuilder RegisterCoreServices(this WebApplicationBuilder webApplicationBuilder)
    {
        webApplicationBuilder.Services.AddSingleton<IConfigManager, ConfigManager>();
        webApplicationBuilder.Services.AddSingleton<CalendarManagerFactory>();
        webApplicationBuilder.Services.AddSingleton(provider =>
        {
            var factory = provider.GetService<CalendarManagerFactory>()!;
            return factory.Create();
        });

        webApplicationBuilder.Services.AddHttpClient(
            "TelegramBot",
            client => client.BaseAddress = new Uri("https://api.telegram.org/"));
        webApplicationBuilder.Services.AddTransient<ITelegramBotClient, TelegramBotClient>(provider =>
        {
            var configManager = provider.GetRequiredService<IConfigManager>();
            var clientFactory = provider.GetRequiredService<IHttpClientFactory>();
            var client = new TelegramBotClient(configManager.GetBotToken(), clientFactory.CreateClient("TelegramBot"));
            return client;
        });

        webApplicationBuilder.Services.AddTransient<PrivateChatManager>();
        webApplicationBuilder.Services.AddTransient<MainGroupChat>();

        return webApplicationBuilder;
    }
}
