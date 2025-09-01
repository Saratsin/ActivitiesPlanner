using Google.Apis.Auth.OAuth2;
using Google.Apis.Calendar.v3;
using Google.Apis.Services;
using TelegramBot.Configuration;
using TelegramBot.Exceptions;

namespace TelegramBot.Calendar;

public class CloudCalendarManager : CalendarManager
{
    private bool _isInitialized;

    public CloudCalendarManager(IConfigManager configManager, ILogger<CalendarManager> logger) : base(configManager,
        logger)
    {
    }

    protected override async Task<CalendarService> InternalLogin()
    {
        try
        {
            var credential = await GoogleCredential.GetApplicationDefaultAsync();
            var calendarService = new CalendarService(new BaseClientService.Initializer
            {
                HttpClientInitializer = credential,
                ApplicationName = "TelegramBot"
            });


            _isInitialized = true;

            return calendarService;
        }
        catch (Exception e)
        {
            Console.WriteLine(e);
            throw new CalendarLoginException(e);
        }
    }

    protected override async Task Relogin()
    {
        if (!_isInitialized)
            await Login();
    }
}