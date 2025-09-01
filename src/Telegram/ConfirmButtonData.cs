namespace TelegramBot.Telegram;

public class ConfirmButtonData : ButtonData
{
    public ConfirmButtonData(ButtonData parentData)
    {
        Type = "Confirm";
        Date = parentData.Date;
        Activity = parentData.Activity;
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