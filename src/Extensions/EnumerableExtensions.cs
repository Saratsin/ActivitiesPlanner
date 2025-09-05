namespace TelegramBot.Extensions;

public static class EnumerableExtensions
{
    public static Task Foreach<T>(this IEnumerable<T> source, Func<T, Task> action)
    {
        if (source == null) throw new ArgumentNullException(nameof(source));
        if (action == null) throw new ArgumentNullException(nameof(action));
        
        return Task.WhenAll(source.Select(action));
    }

    public static bool In<T>(this T source, IReadOnlyCollection<T> values)
    {
        if (source == null) throw new ArgumentNullException(nameof(source));
        if (values == null) throw new ArgumentNullException(nameof(values));

        return values.Contains(source);
    }

    public static bool NotIn<T>(this T source, IReadOnlyCollection<T> values)
    {
        return !In(source, values);
    }

    public static IEnumerable<T> NotIn<T>(this IEnumerable<T> source, params T[] values)
    {
        if (source == null) throw new ArgumentNullException(nameof(source));
        if (values == null) throw new ArgumentNullException(nameof(values));
        
        return source.Where(item => !values.Contains(item));
    }
    
    public static IEnumerable<T> In<T>(this IEnumerable<T> source, params T[] values)
    {
        if (source == null) throw new ArgumentNullException(nameof(source));
        if (values == null) throw new ArgumentNullException(nameof(values));
        
        return source.Where(values.Contains);
    }
    
    public static IEnumerable<TItem> NotIn<TItem, TKey>(this IEnumerable<TItem> source, Func<TItem, TKey> keySelector, params TKey[] values)
    {
        if (source == null) throw new ArgumentNullException(nameof(source));
        if (keySelector == null) throw new ArgumentNullException(nameof(keySelector));
        if (values == null) throw new ArgumentNullException(nameof(values));
        
        return source.Where(item => !values.Contains(keySelector(item)));
    }
    
    public static IEnumerable<TItem> In<TItem, TKey>(this IEnumerable<TItem> source, Func<TItem, TKey> keySelector, params TKey[] values)
    {
        if (source == null) throw new ArgumentNullException(nameof(source));
        if (keySelector == null) throw new ArgumentNullException(nameof(keySelector));
        if (values == null) throw new ArgumentNullException(nameof(values));
        
        return source.Where(item => values.Contains(keySelector(item)));
    }
}