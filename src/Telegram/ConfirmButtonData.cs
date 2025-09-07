namespace TelegramBot.Telegram;

public record ConfirmButtonData : ButtonData
{
    public ConfirmButtonData(ButtonData parentData)
        : base("Confirm")
    {
        Date = parentData.Date;
        Activity = parentData.Activity;
    }
}

public record ConfirmCancelButtonData() : ButtonData("ConfirmCancel");

public record EventButtonData : ButtonData
{
    public EventButtonData(string eventId)
        : base("SelectEvent")
    {
        EventId = eventId;
    }
}
