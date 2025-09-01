namespace TelegramBot.Core;

public class UserTimeSlot
{
    public UserTimeSlot(string eventId, DateTimeOffset start, DateTimeOffset end, string summary)
    {
        EventId = eventId;
        Start = start;
        End = end;
        Summary = summary;
    }

    public string EventId { get; }
    public DateTimeOffset Start { get; }
    public DateTimeOffset End { get; }
    public string Summary { get; }
}