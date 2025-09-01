namespace TelegramBot.Core;

public class TimeSlot
{
    public TimeOnly Start { get; set; }
    public TimeOnly End { get; set; }

    public string ToView()
    {
        return $"{Start:HH:mm} - {End:HH:mm}";
    }
}

public class CalendarTimeSlot : TimeSlot
{
    public bool IsEmpty { get; set; }
}