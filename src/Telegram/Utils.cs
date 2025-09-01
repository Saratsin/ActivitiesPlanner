using System.Globalization;
using TelegramBot.Core;

namespace TelegramBot.Telegram;

public static class Utils
{
    // Merges adjacent time slots
    public static List<TimeSlot> MergeTimeSlots(List<string> selectedTimeSlots)
    {
        if (selectedTimeSlots == null || selectedTimeSlots.Count == 0) return new List<TimeSlot>();

        var slots = selectedTimeSlots
                    .Select(slot => new TimeSlot
                        { Start = TimeOnly.Parse(slot.Split('-')[0]), End = TimeOnly.Parse(slot.Split('-')[1]) })
                    .OrderBy(s => s.Start)
                    .ToList();

        var merged = new List<TimeSlot>();
        var current = slots.First();

        foreach (var slot in slots.Skip(1))
            if (slot.Start == current.End)
            {
                current = new TimeSlot { Start = current.Start, End = slot.End };
            }
            else
            {
                merged.Add(current);
                current = slot;
            }

        merged.Add(current);

        return merged.ToList();
    }

    // Gets the Ukrainian day of the week
    public static string GetUkrainianDayOfWeek(DayOfWeek date)
    {
        var culture = new CultureInfo("uk-UA");
        return culture.DateTimeFormat.GetDayName(date);
    }

    // A simple date addition method
    public static DateTime DateAdd(DateTime date, string part, int value)
    {
        switch (part)
        {
            case "minute":
                return date.AddMinutes(value);
            default:
                throw new ArgumentException("Invalid date part");
        }
    }
}