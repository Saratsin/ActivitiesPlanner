using TelegramBot.Configuration;

namespace TelegramBot.Filters;

public class WebHookFilter : IEndpointFilter
{
    private readonly IConfigManager _configuration;

    public WebHookFilter(IConfigManager configuration)
    {
        _configuration = configuration;
    }

    public async ValueTask<object> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var secret = _configuration.GetTelegramWebhookSecret();
        var hasToken =
            context.HttpContext.Request.Headers.TryGetValue("X-Telegram-Bot-Api-Secret-Token", out var token);
        if (!hasToken)
            return Results.Unauthorized();
        if (token.ToString() != secret)
            return Results.Unauthorized();

        return await next(context);
    }
}