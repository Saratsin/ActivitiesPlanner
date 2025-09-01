namespace TelegramBot.Configuration;

public class CalendarSettings
{
    public string Id { get; set; }
    public string UsualStartTime { get; set; }
    public string UsualEndTime { get; set; }
    public string WeekendStartTime { get; set; }
    public string WeekendEndTime { get; set; }
    public int TimeSlotMinutes { get; set; }
    public int BookingTimeRange { get; set; }
}