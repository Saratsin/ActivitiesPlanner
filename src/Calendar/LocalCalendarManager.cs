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
                new FileDataStore("Cache4"), localServerCodeReceiver
            );
            
            var initializer = new BaseClientService.Initializer
            {
                HttpClientInitializer = _authorize,
                ApplicationName = "TelegramBot"
            };
            
            
            return new CalendarService(initializer);
            
            // var settings = ConfigManager.GetCalendarLoginSetting();
            //
            // var flow = new GoogleAuthorizationCodeFlow(new GoogleAuthorizationCodeFlow.Initializer
            // {
            //     ClientSecrets = new ClientSecrets
            //     {
            //         ClientId = settings.ClientId,
            //         ClientSecret = settings.Secret
            //     },
            //     Scopes = new[] { CalendarService.Scope.Calendar },
            //     DataStore = new FileDataStore("Cache")
            // });
            //
            // //var receiver = new LocalServerCodeReceiver();
            // var receiver = new StaticLocalHostReceiver();
            // Console.WriteLine(receiver.RedirectUri);
            //
            // var authUrl = (GoogleAuthorizationCodeRequestUrl)flow.CreateAuthorizationCodeRequest(receiver.RedirectUri);
            // authUrl.AccessType = "offline";
            // authUrl.Prompt = "consent";
            //
            // var codeResponse = await receiver.ReceiveCodeAsync(authUrl, CancellationToken.None);
            // var codeResponseCode = codeResponse.Code;
            // return null;
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