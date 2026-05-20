using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Auth.OAuth2.Responses;
using Google.Apis.Calendar.v3;
using Google.Apis.Services;
using TelegramBot.Configuration;
using TelegramBot.Exceptions;

namespace TelegramBot.Calendar;

public class CloudOAuthCalendarManager : CalendarManager
{
    private readonly IConfigManager _configManager;
    private bool _isInitialized;

    public CloudOAuthCalendarManager(IConfigManager configManager, ILogger<CalendarManager> logger) : base(configManager,
        logger)
    {
        _configManager = configManager;
    }

    protected override Task<CalendarService> InternalLogin()
    {
        var loginSetting = _configManager.GetCalendarLoginSetting();
        var flow = new GoogleAuthorizationCodeFlow(new GoogleAuthorizationCodeFlow.Initializer
        {
            ClientSecrets = new ClientSecrets
            {
                ClientId = loginSetting.ClientId,
                ClientSecret = loginSetting.Secret
            },
            Scopes = new[] { CalendarService.Scope.Calendar }
        });

        var token = new TokenResponse
        {
            RefreshToken = loginSetting.RefreshToken
        };

        var credential = new UserCredential(flow, "newenglandsportsfield@gmail.com", token);

        var calendarService = new CalendarService(new BaseClientService.Initializer
        {
            HttpClientInitializer = credential,
            ApplicationName = "TelegramBot"
        });

        _isInitialized = true;
        return Task.FromResult(calendarService);
    }
    
    protected override async Task Relogin()
    {
        if (!_isInitialized)
            await Login();
    }
}