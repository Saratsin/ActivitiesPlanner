using Telegram.Bot.Types;
using TelegramBot.Calendar;
using TelegramBot.Calendar.Abstract;
using TelegramBot.Configuration;
using TelegramBot.IoC;
using TelegramBot.Requests;
using TelegramBot.Services;
using TelegramBot.Telegram;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddLogging(loggingBuilder => loggingBuilder.AddConsole().SetMinimumLevel(LogLevel.Information));
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
    await manager.Authorize();

    return Results.Ok("200 Ok");
});
app.MapGet("/calendar", async (CalendarManager manager) =>
{
    var calendar = await manager.GetCalendar();
    return Results.Ok($"200 Ok: {string.Join("\r\n", calendar.GetDaysWithEmptySlots())}");
});


// TODO add AddAuthentication
// app.UseCors();
// app.UseAuthentication();
// app.UseAuthorization();

app.Run();
