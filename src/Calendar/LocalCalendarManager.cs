using Google.Apis.Auth.OAuth2;
using Google.Apis.Calendar.v3;
using Google.Apis.Services;
using Google.Apis.Util.Store;
using TelegramBot.Configuration;
using TelegramBot.Exceptions;

namespace TelegramBot.Calendar;

public class LocalCalendarManager : CalendarManager
{
    private UserCredential _authorize;

    public LocalCalendarManager(IConfigManager configManager, ILogger<CalendarManager> logger) : base(configManager,
        logger)
    {
    }

    protected override async Task<CalendarService> InternalLogin()
    {
        try
        {
            var settings = ConfigManager.GetCalendarLoginSetting();

            var localServerCodeReceiver = new StaticLocalHostReceiver();

            _authorize = await GoogleWebAuthorizationBroker.AuthorizeAsync(new ClientSecrets
                {
                    ClientSecret = settings.Secret,
                    ClientId = settings.ClientId
                },
                new[] { CalendarService.Scope.Calendar },
                settings.User,
                CancellationToken.None,
                new FileDataStore("Cache"), localServerCodeReceiver
            );

            var initializer = new BaseClientService.Initializer
            {
                HttpClientInitializer = _authorize,
                ApplicationName = "TelegramBot"
            };


            return new CalendarService(initializer);
        }
        catch (Exception e)
        {
            Console.WriteLine(e);
            throw new CalendarLoginException(e);
        }
    }

    protected override async Task Relogin()
    {
        if (_authorize == null)
        {
            await Login();
            return;
        }

        if (_authorize.Token.IsStale)
            await RefreshToken();
    }

    public async Task RefreshToken()
    {
        await _authorize.RefreshTokenAsync(CancellationToken.None);
    }

    public async Task<long?> GetTokenInfo()
    {
        await Relogin();
        return _authorize.Token.ExpiresInSeconds;
    }
}