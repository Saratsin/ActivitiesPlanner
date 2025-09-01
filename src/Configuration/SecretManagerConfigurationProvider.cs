using System.Text;
using Google.Cloud.SecretManager.V1;

namespace TelegramBot.Configuration;

public class SecretManagerConfigurationProvider : ConfigurationProvider
{
    private readonly SecretManagerServiceClient _client;
    private readonly string _projectId;
    private readonly string[] _secretNames;

    public SecretManagerConfigurationProvider(SecretManagerServiceClient client, string projectId, string[] secretNames)
    {
        _client = client;
        _projectId = projectId;
        _secretNames = secretNames;
    }

    public override void Load()
    {
        var data = new Dictionary<string, string>();

        foreach (var secretName in _secretNames)
            try
            {
                var secretVersionName = new SecretVersionName(_projectId, secretName, "latest");
                var result = _client.AccessSecretVersion(secretVersionName);

                var secretValue = Encoding.UTF8.GetString(result.Payload.Data.ToByteArray());
                var parsedData = JsonConfigurationParser.Parse(secretValue);
                foreach (var pair in parsedData) data.Add($"{secretName}:{pair.Key}", pair.Value);
            }
            catch (Exception ex)
            {
                // Handle exceptions, e.g., secret not found
                Console.WriteLine($"Could not load secret '{secretName}': {ex.Message}");
            }

        Data = data;
    }
}