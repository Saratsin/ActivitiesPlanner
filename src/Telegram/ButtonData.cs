using Newtonsoft.Json;

namespace TelegramBot.Telegram;

public class ButtonData
{
    public string Type { get; set; }
    public int Activity { get; set; }
    public string Date { get; set; }
    public string Start { get; set; }
    public string End { get; set; }

    public string EventId { get; set; }

    public static ButtonData FromActivity(ButtonData parentData, int activity)
    {
        return new ButtonData { Type = "SelectActivity", Activity = activity };
    }

    public static ButtonData FromDate(ButtonData parentData, DateOnly date)
    {
        return new ButtonData
            { Type = "SelectDate", Activity = parentData.Activity, Date = date.ToString("yyyy-MM-dd") };
    }

    public static ButtonData FromTime(TimeOnly from, TimeOnly to)
    {
        return new ButtonData { Type = "SelectTime", Start = from.ToString("HH:mm"), End = to.ToString("HH:mm") };
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