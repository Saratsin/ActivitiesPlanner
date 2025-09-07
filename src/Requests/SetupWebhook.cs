namespace TelegramBot.Requests;

public record SetupWebhook
{
    public required string Url { get; init; }
}
