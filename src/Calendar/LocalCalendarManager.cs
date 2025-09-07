using Google.Apis.Auth.OAuth2;
using Google.Apis.Calendar.v3;
using Google.Apis.Services;
using Google.Apis.Util.Store;
using TelegramBot.Calendar.Abstract;
using TelegramBot.Configuration;
using TelegramBot.Exceptions;

namespace TelegramBot.Calendar;

public class LocalCalendarManager(IConfigManager configManager, ILogger<CalendarManager> logger)
    : CalendarManager(configManager, logger)
{
    private UserCredential? _credential;

    protected override async Task<CalendarService> DoAuthorize()
    {
        try
        {
            var settings = _configManager.GetCalendarAutorizationSettings();

            var localServerCodeReceiver = new StaticLocalHostReceiver();

            _credential = await GoogleWebAuthorizationBroker.AuthorizeAsync(new ClientSecrets
                {
                    ClientSecret = settings.Secret,
                    ClientId = settings.ClientId
                },
                [CalendarService.Scope.Calendar],
                settings.User,
                CancellationToken.None,
                new FileDataStore("Cache"), localServerCodeReceiver
            );

            var initializer = new BaseClientService.Initializer
            {
                HttpClientInitializer = _credential,
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

    protected override async Task EnsureAuthorized()
    {
        if (_credential is null)
        {
            await Authorize();
            return;
        }

        if (_credential.Token.IsStale)
            await RefreshToken();
    }

    public async Task<long?> GetTokenInfo()
    {
        await EnsureAuthorized();
        return _credential!.Token.ExpiresInSeconds;
    }

    private Task<bool> RefreshToken()
    {
        return _credential!.RefreshTokenAsync(CancellationToken.None);
    }

}
