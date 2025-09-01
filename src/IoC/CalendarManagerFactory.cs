using TelegramBot.Calendar;
using TelegramBot.Configuration;

namespace TelegramBot.IoC;

public class CalendarManagerFactory
{
    private readonly IConfigManager _configManager;
    private readonly ILogger<CalendarManager> _logger;

    public CalendarManagerFactory(IConfigManager configManager, ILogger<CalendarManager> logger)
    {
        _configManager = configManager;
        _logger = logger;
    }

    public CalendarManager Create()
    {
        var isCloudRun = _configManager.IsCloudRun();
        var mode = isCloudRun ? "Cloud" : "Local";
        _logger.LogInformation($"Creating CalendarManager for {mode}");
        return isCloudRun
            ? new CloudCalendarManager(_configManager, _logger)
            : new LocalCalendarManager(_configManager, _logger);
    }
}