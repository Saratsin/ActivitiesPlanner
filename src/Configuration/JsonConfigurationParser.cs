using System.Diagnostics;
using System.Text.Json;

namespace TelegramBot.Configuration;

internal sealed class JsonConfigurationParser
{
    private readonly Dictionary<string, string?> _data = new(StringComparer.OrdinalIgnoreCase);
    private readonly Stack<string> _paths = new();

    private JsonConfigurationParser()
    {
    }

    public static IDictionary<string, string> Parse(string input)
    {
        return new JsonConfigurationParser().ParseString(input);
    }

    private Dictionary<string, string> ParseString(string jsonData)
    {
        var jsonDocumentOptions = new JsonDocumentOptions
        {
            CommentHandling = JsonCommentHandling.Skip,
            AllowTrailingCommas = true
        };

        using (var doc = JsonDocument.Parse(jsonData, jsonDocumentOptions))
        {
            if (doc.RootElement.ValueKind != JsonValueKind.Object) throw new FormatException();
            VisitObjectElement(doc.RootElement);
        }

        return _data;
    }

    private void VisitObjectElement(JsonElement element)
    {
        var isEmpty = true;

        foreach (var property in element.EnumerateObject())
        {
            isEmpty = false;
            EnterContext(property.Name);
            VisitValue(property.Value);
            ExitContext();
        }

        SetNullIfElementIsEmpty(isEmpty);
    }

    private void VisitArrayElement(JsonElement element)
    {
        var index = 0;

        foreach (var arrayElement in element.EnumerateArray())
        {
            EnterContext(index.ToString());
            VisitValue(arrayElement);
            ExitContext();
            index++;
        }

        SetNullIfElementIsEmpty(index == 0);
    }

    private void SetNullIfElementIsEmpty(bool isEmpty)
    {
        if (isEmpty && _paths.Count > 0) _data[_paths.Peek()] = null;
    }

    private void VisitValue(JsonElement value)
    {
        Debug.Assert(_paths.Count > 0);

        switch (value.ValueKind)
        {
            case JsonValueKind.Object:
                VisitObjectElement(value);
                break;

            case JsonValueKind.Array:
                VisitArrayElement(value);
                break;

            case JsonValueKind.Number:
            case JsonValueKind.String:
            case JsonValueKind.True:
            case JsonValueKind.False:
            case JsonValueKind.Null:
                var key = _paths.Peek();
                if (_data.ContainsKey(key)) throw new FormatException("Error_KeyIsDuplicated");
                _data[key] = value.ToString();
                break;

            default:
                throw new FormatException("Error_UnsupportedJSONToken");
        }
    }

    private void EnterContext(string context)
    {
        _paths.Push(_paths.Count > 0 ? _paths.Peek() + ConfigurationPath.KeyDelimiter + context : context);
    }

    private void ExitContext()
    {
        _paths.Pop();
    }
}