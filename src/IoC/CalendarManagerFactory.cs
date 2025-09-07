using TelegramBot.Calendar;
using TelegramBot.Calendar.Abstract;
using TelegramBot.Configuration;

namespace TelegramBot.IoC;

public class CalendarManagerFactory(IConfigManager configManager, ILogger<CalendarManager> logger)
{
    private readonly IConfigManager _configManager = configManager;
    private readonly ILogger<CalendarManager> _logger = logger;

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
