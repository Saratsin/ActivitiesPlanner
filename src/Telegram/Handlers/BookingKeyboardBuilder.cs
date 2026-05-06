using Telegram.Bot.Types.ReplyMarkups;
using TelegramBot.Calendar;
using TelegramBot.Core;

namespace TelegramBot.Telegram.Handlers;

public class BookingKeyboardBuilder
{
    private readonly CalendarManager _calendarManager;

    public BookingKeyboardBuilder(CalendarManager calendarManager)
    {
        _calendarManager = calendarManager;
    }

    public List<List<InlineKeyboardButton>> GetAvailableActivities(ButtonData parentData)
    {
        return Activities.All
            .Select((t, i) => (List<InlineKeyboardButton>)
                [new InlineKeyboardButton { Text = t, CallbackData = ButtonData.FromActivity(parentData, i).ToJson() }])
            .ToList();
    }

    public async Task<List<List<InlineKeyboardButton>>> GetAvailableDates(ButtonData parentData)
    {
        var buttons = new List<List<InlineKeyboardButton>>();
        var calendar = await _calendarManager.GetCalendar();
        var availableDays = calendar.GetDaysWithEmptySlots();
        foreach (var day in availableDays)
        {
            var buttonDate = day.ToString("yyyy-MM-dd");
            var dayName = Utils.GetUkrainianDayOfWeek(day.DayOfWeek);
            buttons.Add([
                new InlineKeyboardButton
                {
                    Text = $"{buttonDate} ({dayName})",
                    CallbackData = ButtonData.FromDate(parentData, day).ToJson()
                }
            ]);
        }
        buttons.Add([new InlineKeyboardButton { Text = "Скасувати", CallbackData = "cancel" }]);
        return buttons;
    }

    public async Task<List<List<InlineKeyboardButton>>> GetDayTimeSlotsButtons(string dateView, int activity)
    {
        var date = DateTime.Parse(dateView);
        var buttons = new List<List<InlineKeyboardButton>>();
        var calendar = await _calendarManager.GetCalendar();
        var emptySlots = calendar.GetEmptySlots(DateOnly.FromDateTime(date));

        foreach (var emptySlot in emptySlots)
            buttons.Add([
                new InlineKeyboardButton(emptySlot.ToView(),
                    ButtonData.FromTime(emptySlot.Start, emptySlot.End).ToJson())
            ]);

        buttons.Add([
            new InlineKeyboardButton
            {
                Text = "Підтвердити",
                CallbackData = new ConfirmButtonData(dateView, activity).ToJson()
            }
        ]);
        buttons.Add([new InlineKeyboardButton { Text = "Скасувати", CallbackData = "cancel" }]);
        return buttons;
    }
}
