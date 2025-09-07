namespace TelegramBot.Configuration;

public record CalendarApiSettings
{
    public required string User { get; init; }
    public required string ClientId { get; init; }
    public required string Secret { get; init; }
}
