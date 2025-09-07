using System.Net;
using Google;
using Google.Apis.Calendar.v3;
using Google.Apis.Calendar.v3.Data;
using TelegramBot.Configuration;
using TelegramBot.Core;

namespace TelegramBot.Calendar.Abstract;

public abstract class CalendarManager(IConfigManager configManager, ILogger<CalendarManager> logger)
{
    protected readonly IConfigManager _configManager = configManager;
    private readonly ILogger<CalendarManager> _logger = logger;

    private CalendarService? _calendarService;

    public async Task Authorize()
    {
        _calendarService = await DoAuthorize();
    }

    public async Task<Core.Calendar> GetCalendar()
    {
        await EnsureAuthorized();

        var config = _configManager.GetCalendarConfig();
        var eventQuery = _calendarService!.Events.List(config.Id)!;

        eventQuery.TimeMinDateTimeOffset = DateTimeOffset.Now.Date;
        eventQuery.TimeMaxDateTimeOffset = DateTimeOffset.Now.Date.AddDays(config.BookingTimeRange + 1);
        var allEvents = new List<Event>();
        var events = await eventQuery.ExecuteAsync();
        allEvents.AddRange(events.Items);
        while (events.NextPageToken != null)
        {
            eventQuery.PageToken = events.NextPageToken;
            events = await eventQuery.ExecuteAsync();
            allEvents.AddRange(events.Items);
        }

        var nowDate = DateOnly.FromDateTime(DateTime.Now);

        var calendar = new Core.Calendar(nowDate, nowDate.AddDays(config.BookingTimeRange), config);
        foreach (var @event in allEvents)
            calendar.PushEvent(
                @event.Start.DateTimeDateTimeOffset!.Value.DateTime,
                @event.End.DateTimeDateTimeOffset!.Value.DateTime);

        return calendar;
    }


    /// <summary>
    ///     TODO Handle race condition situations
    /// </summary>
    public async Task BookSlots(string username, string email, Activity activity, DateOnly date, List<TimeSlot> timeSlots)
    {
        await EnsureAuthorized();

        var config = _configManager.GetCalendarConfig();
        var isEmailExists = string.IsNullOrWhiteSpace(email);
        var events = _calendarService!.Events;
        foreach (var timeSlot in timeSlots)
        {
            var insertRequest = events.Insert(new Event
            {
                Kind = "calendar#event",
                Start = new EventDateTime
                {
                    DateTimeDateTimeOffset = new DateTimeOffset(date, timeSlot.Start, TimeSpan.FromHours(3)),
                    TimeZone = "Europe/Kiev"
                },
                End = new EventDateTime
                {
                    DateTimeDateTimeOffset = new DateTimeOffset(date, timeSlot.End, TimeSpan.FromHours(3)),
                    TimeZone = "Europe/Kiev"
                },
                // Creator = new Event.CreatorData {Email = email, Id = username, DisplayName = username, Self = true},
                // Organizer = new Event.OrganizerData {Email = email, Id = username, DisplayName = username, Self = true},
                Attendees = isEmailExists
                    ? new List<EventAttendee>
                    {
                        new()
                        {
                            Email = email,
                            DisplayName = username,
                            Id = username
                        }
                    }
                    : null,
                Summary = $"{activity}",
                Description =
                    $"<b>Телеграм</b>\n{username}\nЗв'язатися зі мною:t.me/{username}\n<br>Сервіс з бронювання СпортМайданчику в ЖК \"Нова Англія\" " +
                    $"Бронювати <a href=\"https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ2ZtidqUFIcSRBmf1j2cvLeBPI8h5GO5EMgQm9UhsqXFzwde4HgvBiT4VIUhncYOQs3N7Ybl3No\">туть</a>",
                Status = "confirmed",
                Transparency = "opaque",
                Visibility = "public",
                Reminders = new Event.RemindersData { UseDefault = true },
                ColorId = ((int)activity).ToString(),
                Location = "Нова Англія, вулиця Михайла Максимовича, 24, Київ, Україна, 03066"
            }, config.Id);


            await insertRequest.ExecuteAsync();
        }
    }

    public async IAsyncEnumerable<UserTimeSlot> GetUserBookingAsync(string userName)
    {
        await EnsureAuthorized();
        var config = _configManager.GetCalendarConfig();
        var eventQuery = _calendarService!.Events.List(config.Id);

        eventQuery.TimeMinDateTimeOffset = DateTimeOffset.Now.Date;
        eventQuery.TimeMaxDateTimeOffset = DateTimeOffset.Now.Date.AddDays(7);

        var allEvents = new List<Event>();
        var events = await eventQuery.ExecuteAsync();
        allEvents.AddRange(events.Items);
        while (events.NextPageToken != null)
        {
            eventQuery.PageToken = events.NextPageToken;
            events = await eventQuery.ExecuteAsync();
            allEvents.AddRange(events.Items);
        }

        foreach (var @event in allEvents.Where(@event => @event.Description?.Contains(userName) is true))
            yield return new UserTimeSlot(
                @event.Id,
                @event.Start.DateTimeDateTimeOffset!.Value,
                @event.End.DateTimeDateTimeOffset!.Value,
                @event.Summary);
    }

    public async Task CancelEvents(List<string> selectedEvents)
    {
        await EnsureAuthorized();

        foreach (var selectedEvent in selectedEvents)
            try
            {
                var config = _configManager.GetCalendarConfig();
                await _calendarService!.Events.Delete(config.Id, selectedEvent).ExecuteAsync();
            }
            catch (GoogleApiException ex) when (ex.HttpStatusCode is HttpStatusCode.NotFound or HttpStatusCode.Gone)
            {
            }
            catch (Exception e)
            {
                _logger.LogError(e, e.Message);
                throw;
            }
    }

    protected abstract Task<CalendarService> DoAuthorize();

    protected abstract Task EnsureAuthorized();
}
