using TelegramBot.Calendar;

namespace TelegramBot.Services;

/// <summary>
/// TODO investigate how to not run if not local testing
/// </summary>
public class RefreshTokenService : BackgroundService
{
    private readonly CalendarManager _calendarManager;
    private readonly ILogger<RefreshTokenService> _logger;

    public RefreshTokenService(ILogger<RefreshTokenService> logger, CalendarManager calendarManager)
    {
        _logger = logger;
        _calendarManager = calendarManager;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("MyBackgroundService is starting.");

        if (_calendarManager is LocalCalendarManager localCalendarManager)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogInformation("MyBackgroundService is doing work at: {time}", DateTimeOffset.Now);
                try
                {
                    var expireInSeconds = await localCalendarManager.GetTokenInfo();
                    var fromSeconds = TimeSpan.FromSeconds(expireInSeconds.GetValueOrDefault() - 100);
                    if (fromSeconds <= TimeSpan.Zero)
                        fromSeconds = TimeSpan.FromSeconds(1);

                    await Task.Delay(fromSeconds, stoppingToken); // Simulate work
                }
                catch (Exception e)
                {
                    _logger.LogError(e, "An error occurred while refreshing token.");
                    await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
                }
            }
        }
        else
        {
            _logger.LogWarning($"{nameof(LocalCalendarManager)} is not used. RefreshTokenService is not needed");
            await StopAsync(stoppingToken);
        }


        _logger.LogInformation("MyBackgroundService is stopping.");
    }
}