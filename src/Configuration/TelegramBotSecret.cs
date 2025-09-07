namespace TelegramBot.Configuration;

public record TelegramBotSecret
{
    public required string Token { get; init; }
    public required string WebhookBotSecret { get; init; }
}
