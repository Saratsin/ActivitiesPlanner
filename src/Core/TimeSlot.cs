namespace TelegramBot.Core;

public class TimeSlot
{
    public required TimeOnly Start { get; init; }
    public required TimeOnly End { get; init; }

    public override string ToString()
    {
        return $"{Start:HH:mm} - {End:HH:mm}";
    }
}

public class CalendarTimeSlot : TimeSlot
{
    public bool IsEmpty { get; set; }
}
