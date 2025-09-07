using Newtonsoft.Json;
using TelegramBot.Core;

namespace TelegramBot.Telegram;

public record ButtonData(string type)
{
    public string Type { get; } = type;
    public int Activity { get; init; }
    public string? Date { get; init; }
    public string? Start { get; init; }
    public string? End { get; init; }
    public string? EventId { get; init; }

    public static ButtonData FromActivity(Activity activity)
    {
        return new ButtonData("SelectActivity") { Activity = (int)activity };
    }

    public static ButtonData FromDate(ButtonData parentData, DateOnly date)
    {
        return new ButtonData("SelectDate")
        {
            Activity = parentData.Activity, Date = date.ToString("yyyy-MM-dd")
        };
    }

    public static ButtonData FromTime(TimeOnly from, TimeOnly to)
    {
        return new ButtonData("SelectTime") { Start = from.ToString("HH:mm"), End = to.ToString("HH:mm") };
    }

    public string ToJson()
    {
        return JsonConvert.SerializeObject(this, JsonSetting.Minimal);
    }
}

public static class JsonSetting
{
    public static readonly JsonSerializerSettings Minimal = new()
    {
        NullValueHandling = NullValueHandling.Ignore,
        DefaultValueHandling = DefaultValueHandling.Ignore,
        Formatting = Formatting.None
    };

    public static readonly JsonSerializerSettings Intended = new()
    {
        NullValueHandling = NullValueHandling.Ignore,
        DefaultValueHandling = DefaultValueHandling.Ignore,
        Formatting = Formatting.Indented
    };
}
