namespace TelegramBot.Core;

public enum Activity
{
    Football,
    Basketball,
    Tennis,
    Volleyball,
    Badminton,
    Other
}

public static class ActivityExtensions
{
    public static string ToLocalizedString(this Activity activity)
    {
        return activity switch
        {
            Activity.Football => "Футбол",
            Activity.Basketball => "Баскетбол",
            Activity.Tennis => "Теніс",
            Activity.Volleyball => "Волейбол",
            Activity.Badminton => "Бадмінтон",
            _ => "Інше"
        };
    }
}
