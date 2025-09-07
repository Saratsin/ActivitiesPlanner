namespace TelegramBot.Core;

public class UserTimeSlot(string eventId, DateTimeOffset start, DateTimeOffset end, string summary)
{
    public string EventId { get; } = eventId;
    public DateTimeOffset Start { get; } = start;
    public DateTimeOffset End { get; } = end;
    public string Summary { get; } = summary;
}
