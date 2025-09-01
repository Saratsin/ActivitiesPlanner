using Google.Cloud.SecretManager.V1;

namespace TelegramBot.Configuration;

public class CloudSecretConfigurationSource : IConfigurationSource
{
    public IConfigurationProvider Build(IConfigurationBuilder builder)
    {
        // Using a new client for simplicity, but a shared instance is better for performance.
        var client = SecretManagerServiceClient.Create();
        return new SecretManagerConfigurationProvider(client, "activitiesplaner",
            ["TelegramBotSecret", "CalendarApiSecret"]);
    }
}