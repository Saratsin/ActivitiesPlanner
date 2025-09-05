using Google.Apis.Calendar.v3.Data;

namespace TelegramBot.Calendar;

public static class GoogleCalendarExtensions
{
    public static DateTime GetDateTime(this EventDateTime dateTime) =>
        dateTime.DateTimeDateTimeOffset.Value.DateTime;
}