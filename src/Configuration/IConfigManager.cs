using System.Collections.Concurrent;
using Telegram.Bot.Types;

namespace TelegramBot.Configuration;

public interface IConfigManager
{
    string? GetProperty(string key);
    void SetProperty(string key, string value);
    CalendarApiSettings GetCalendarAutorizationSettings();
    void SetCalendarLogin(CalendarApiSettings calendarApiSettings);
    string GetBotToken();
    string GetTelegramWebhookSecret();
    CalendarSettings GetCalendarConfig();
    string[] GetAdminsChats();
    bool IsCloudRun();
    ChatId GetMainChatId();
    string GetBotName();
}

public class ConfigManager : IConfigManager
{
    private readonly IConfiguration _configuration;
    private readonly ConcurrentDictionary<string, string> _cache = new();

    public ConfigManager(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string? GetProperty(string key)
    {
        _cache.TryGetValue(key, out var value);
        return value;
    }

    public void SetProperty(string key, string value)
    {
        _cache.AddOrUpdate(key, value, (_, _) => value);
    }

    public CalendarApiSettings GetCalendarAutorizationSettings()
    {
        var configurationSection = _configuration.GetSection("CalendarApiSecret");
        var calendarLoginSetting = configurationSection.Get<CalendarApiSettings>()!;
        return calendarLoginSetting;
    }

    public void SetCalendarLogin(CalendarApiSettings calendarApiSettings)
    {
        var section = _configuration.GetSection("CalendarApiSecret");
        section[nameof(calendarApiSettings.User)] = calendarApiSettings.User;
        section[nameof(calendarApiSettings.Secret)] = calendarApiSettings.Secret;
        section[nameof(calendarApiSettings.ClientId)] = calendarApiSettings.ClientId;
    }

    public string GetBotToken() => _configuration.GetSection("TelegramBotSecret")
                                                 .Get<TelegramBotSecret>()!
                                                 .Token;

    public string GetTelegramWebhookSecret() => _configuration.GetSection("TelegramBotSecret")
                                                              .Get<TelegramBotSecret>()!
                                                              .WebhookBotSecret;

    public CalendarSettings GetCalendarConfig() => _configuration.GetSection("Calendar")
                                                                 .Get<CalendarSettings>()!;

    public string[] GetAdminsChats() => _configuration.GetSection("AdminsChats")
                                                      .Get<string[]>()!;

    public bool IsCloudRun() => _configuration.GetValue<bool>("IsCloudRun");

    public ChatId GetMainChatId() => _configuration.GetValue<long>("MainChatId");

    public string GetBotName() => _configuration.GetValue<string>("BotName")!;

    public void SetupTelegramWebhookSecret(string token) => _configuration["TelegramBotSecret:Token"] = token;
}
