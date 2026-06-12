namespace TelegramBot.Telegram;

public class ConfirmButtonData : ButtonData
{
    public ConfirmButtonData(string date, int activity)
    {
        Type = "Confirm";
        Date = date;
        Activity = activity;
    }
}

public class ConfirmCancelButtonData : ButtonData
{
    public ConfirmCancelButtonData()
    {
        Type = "ConfirmCancel";
    }
}

public class EventButtonData : ButtonData
{
    public static EventButtonData FromEventId(string eventId)
    {
        return new EventButtonData { Type = "SelectEvent", EventId = eventId };
    }
}