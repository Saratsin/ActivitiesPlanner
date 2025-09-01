namespace TelegramBot.Exceptions;

public class CalendarLoginException(Exception innerException)
    : Exception($"Помилка логіну до апі календаря: {innerException.Message}", innerException);