using TelegramBot.Configuration;

namespace TelegramBot.Core;

public class Calendar
{
    private readonly Dictionary<DateOnly, List<CalendarTimeSlot>> _timeSlots;

    public Calendar(DateOnly startDateTime, DateOnly endDateTime, CalendarSettings calendarSettings)
    {
        _timeSlots = new Dictionary<DateOnly, List<CalendarTimeSlot>>();
        InitializeTimeSlots(startDateTime, endDateTime, calendarSettings);
    }

    private void InitializeTimeSlots(DateOnly startDateTime, DateOnly endDateTime, CalendarSettings calendarSettings)
    {
        var (nowDate, nowTime) = DateTime.Now;
        for (var date = startDateTime; date <= endDateTime; date = date.AddDays(1))
        {
            var dailySlots = new List<CalendarTimeSlot>();
            var isWeekend = date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday;

            var dayStartTimeString = isWeekend ? calendarSettings.WeekendStartTime : calendarSettings.UsualStartTime;
            var dayEndTimeString = isWeekend ? calendarSettings.WeekendEndTime : calendarSettings.UsualEndTime;
            var dayStartTime = TimeOnly.Parse(dayStartTimeString);
            var dayEndTime = TimeOnly.Parse(dayEndTimeString);

            var slotTimeOffset = calendarSettings.TimeSlotMinutes;

            for (var time = dayStartTime; time < dayEndTime; time = time.Add(TimeSpan.FromMinutes(slotTimeOffset)))
                dailySlots.Add(new CalendarTimeSlot
                {
                    Start = time,
                    End = time.Add(TimeSpan.FromMinutes(slotTimeOffset)),
                    IsEmpty = true
                });

            if (date == nowDate)
                dailySlots = dailySlots.Except(dailySlots.Where(slot => slot.End < nowTime)).ToList();

            _timeSlots.Add(date, dailySlots);
        }
    }

    public void PushEvent(DateTime start, DateTime end)
    {
        var currentSlotDate = DateOnly.FromDateTime(start);

        if (!_timeSlots.TryGetValue(currentSlotDate, out var dailySlots))
            return;

        dailySlots.Where(slot => slot.Start.ToTimeSpan() >= start.TimeOfDay && slot.End.ToTimeSpan() <= end.TimeOfDay)
                  .ToList().ForEach(slot => slot.IsEmpty = false);
    }

    public TimeSlot[] GetEmptySlots(DateOnly dateOnly)
    {
        if (_timeSlots.TryGetValue(dateOnly, out var dailySlots))
            return dailySlots.Where(slot => slot.IsEmpty).ToArray();

        return Array.Empty<TimeSlot>();
    }

    public DateOnly[] GetDaysWithEmptySlots()
    {
        return _timeSlots.Where(pair => pair.Value.Any(slot => slot.IsEmpty)).Select(pair => pair.Key).ToArray();
    }
}