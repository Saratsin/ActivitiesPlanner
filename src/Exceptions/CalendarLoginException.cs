namespace TelegramBot.Exceptions;

public class CalendarLoginException(Exception innerException)
    : Exception($"Calendar login exception: {innerException.Message}", innerException);