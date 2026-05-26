using System.Text;
using Microsoft.AspNetCore.Mvc;
using Telegram.Bot.Types;
using TelegramBot.Calendar;
using TelegramBot.Configuration;
using TelegramBot.IoC;
using TelegramBot.Requests;
using TelegramBot.Services;
using TelegramBot.Telegram;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddLogging(loggingBuilder => loggingBuilder.AddJsonConsole(options => options.IncludeScopes = true).SetMinimumLevel(LogLevel.Information));
builder.Services.AddSwaggerGen();
builder.Services.AddMemoryCache(options => options.ExpirationScanFrequency = TimeSpan.FromDays(10));


builder.Configuration.Sources.Add(new CloudSecretConfigurationSource());

builder.Services.AddHostedService<RefreshTokenService>();
builder.RegisterCoreServices();

// TODO add AddAuthentication
// builder.Services.AddCors();
// builder.Services.AddAuthentication().AddBearerToken();
// builder.Services.AddAuthentication();
// builder.Services.AddAuthorizationBuilder()
//        .AddPolicy("admin_greetings", policy =>
//            policy
//                .RequireRole("admin")
//                .RequireClaim("scope", "greetings_api"));


var app = builder.Build();


// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}


app.UseHttpsRedirection();

app.MapGet("/", () => "Ok");
// app.MapGet("/check-config", (ConfigManager manager) =>{
//     try
//     {
//         var config = manager.GetCalendarConfig();
//         return Task.FromResult(Results.Ok($"{JsonConvert.SerializeObject(config)}"));
//     }
//     catch (Exception exception)
//     {
//         return Task.FromException<IResult>(exception);
//     }
// });

app.MapPost("telegram/pullUpdates", async (PrivateChatManager manager) =>
{
    await manager.PollUpdates();
    return Results.Ok("200 Ok");
});

app.MapPost("telegram/updateMenu", async (PrivateChatManager manager) =>
{
    await manager.SetupMenu();
    return Results.Ok("200 Ok");
});

app.MapPost("telegram/webhook/setup",
    async (SetupWebhook setup, PrivateChatManager manager) =>
    {
        await manager.SetupWebhook(setup.Url);

        return Results.Ok("200 Ok");
    });
app.MapPost("telegram/webhook", async (Update update, PrivateChatManager manager) =>
{
    // var data = await context.ReadAsStringAsync();
    // var update = JsonConvert.DeserializeObject<Update>(data);
    await manager.ProcessUpdate(update);
    return Results.Ok("200 Ok");
});

app.MapPost("/calendar/login", async (CalendarManager manager) =>
{
    await manager.Login();

    return Results.Ok("200 Ok");
});
app.MapGet("/calendar", async (CalendarManager manager) =>
{
    var calendar = await manager.GetCalendar();
    return Results.Ok($"200 Ok: {string.Join("\r\n", calendar.GetDaysWithEmptySlots())}");
});
app.MapGet("/calendar/usedTime/{userName}", async (CalendarManager manager, [FromRoute]  string userName) =>
{
    var userTime = await manager.GetUsedTime(userName:userName);
    return Results.Ok($"200 Ok: Used time:{userTime}");
});

app.MapGet("/calendar/slots/{userName}", async (CalendarManager manager, [FromRoute]  string userName) =>
{
    var sb = new StringBuilder();
    
    sb.AppendLine($"User: {userName}");
    var tz = TimeZoneInfo.FindSystemTimeZoneById("Europe/Kyiv");
    await foreach (var timeSlot in manager.GetUserBookingAsync(userName: userName))
    {
        var created = TimeZoneInfo.ConvertTime(timeSlot.EventCreatedDateTimeOffset.GetValueOrDefault(),tz);
        var from = TimeZoneInfo.ConvertTime(timeSlot.Start, tz).ToString("dd-MM-yy HH:mm");
        var to = TimeZoneInfo.ConvertTime(timeSlot.End, tz).ToString("dd-MM-yy HH:mm");
        sb.AppendLine($"Event id {timeSlot.EventId} ({created}), {from} - {to}");
    }
    return Results.Ok(sb.ToString());
});


// TODO add AddAuthentication
// app.UseCors();
// app.UseAuthentication();
// app.UseAuthorization();

app.Run();