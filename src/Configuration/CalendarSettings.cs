namespace TelegramBot.Configuration;

public record CalendarSettings
{
    public required string Id { get; init; }
    public required string UsualStartTime { get; init; }
    public required string UsualEndTime { get; init; }
    public required string WeekendStartTime { get; init; }
    public required string WeekendEndTime { get; init; }
    public required int TimeSlotMinutes { get; init; }
    public required int BookingTimeRange { get; init; }
}
