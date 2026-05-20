using System.Net;
using Google;
using Google.Apis.Calendar.v3;
using Google.Apis.Calendar.v3.Data;
using TelegramBot.Configuration;
using TelegramBot.Core;
using TelegramBot.Exceptions;
using TelegramBot.Extensions;

namespace TelegramBot.Calendar;

public abstract class CalendarManager
{
    private readonly ILogger<CalendarManager> _logger;
    protected readonly IConfigManager ConfigManager;
    private CalendarService _calendarService;

    public CalendarManager(IConfigManager configManager, ILogger<CalendarManager> logger)
    {
        ConfigManager = configManager;
        _logger = logger;
    }

    protected abstract Task<CalendarService> InternalLogin();
    protected abstract Task Relogin();

    public async Task Login()
    {
        _calendarService = await InternalLogin();
    }

    public async Task<Core.Calendar> GetCalendar()
    {
        await Relogin();

        var config = ConfigManager.GetCalendarConfig();

        var today = DateTimeOffset.Now.Date;
        var lastBookingDayPlusOne = today.AddDays(config.BookingTimeRange + 1);
        var allEvents = await ReadEvents(config.Id, today, lastBookingDayPlusOne);

        var nowDate = DateOnly.FromDateTime(DateTime.Now);

        var calendar = new Core.Calendar(nowDate, nowDate.AddDays(config.BookingTimeRange), config);
        foreach (var @event in allEvents)
        {
            if (@event.Recurrence is null || @event.Recurrence.Count == 0)
            {
                if (@event.Status == "confirmed")
                    calendar.PushEvent(@event.Start.GetDateTime(), @event.End.GetDateTime());
            }
            else
            {
                var request = _calendarService.Events.Instances(config.Id, @event.Id);
                request.ShowDeleted = false;
                request.MaxResults = 100;
                request.TimeMinDateTimeOffset = today;
                request.TimeMaxDateTimeOffset = lastBookingDayPlusOne;
                var regularEvents = await request.ExecuteAsync();
                foreach (var @regularEvent in regularEvents.Items)
                {
                    if (@regularEvent.Status == "confirmed")
                        calendar.PushEvent(@regularEvent.Start.GetDateTime(), @regularEvent.End.GetDateTime());
                }
            }
        }
            

        return calendar;
    }

    public async Task BookSlots(string username, string email, string activity, DateOnly date, List<TimeSlot> timeSlots)
    {
        await Relogin();

        _logger.LogInformation("Booking slots for {username} ({email}) on {date} for {activity}", username, email, date, activity);
        var config = ConfigManager.GetCalendarConfig();
        var calendarId = "primary" ?? config.Id;
        var isEmailExists = !string.IsNullOrWhiteSpace(email);
        var events = _calendarService.Events;
        var newEvents = new List<Event>();
        foreach (var timeSlot in timeSlots)
        {
            var insertRequest = events.Insert(CreateEvent(username, email, activity, date, timeSlot, isEmailExists), calendarId);
            insertRequest.SendUpdates = EventsResource.InsertRequest.SendUpdatesEnum.All;
            var created = await insertRequest.ExecuteAsync();
            newEvents.Add(created);
            
            _logger.LogInformation("EventId: {CreatedId}", created.Id);
            _logger.LogInformation("Organizer: {OrganizerEmail}", created.Organizer?.Email);
            _logger.LogInformation("Calendar attendees count:   {AttendeesCount}", created.Attendees?.Count);
            if (created.Attendees != null)
            {
                foreach (var a in created.Attendees)
                    _logger.LogInformation("{Email} | {ResponseStatus} | organizer={Organizer}", a.Email, a.ResponseStatus, a.Organizer);
            }
        }

        await CheckRaceCondition(newEvents, config, calendarId);
    }

    private async Task CheckRaceCondition(List<Event> newEvents, CalendarSettings config, string calendarId)
    {
        var min = newEvents.Min(@event => @event.Start.GetDateTime());
        var max = newEvents.Max(@event => @event.End.GetDateTime());
        var newEventsIds = newEvents.Select(@event => @event.Id).ToArray();
        
        var existingEvents = await ReadEvents(config.Id, min, max);
        
        foreach (var existingEvent in existingEvents)
        {
            if (existingEvent.Id.In(newEventsIds))
                continue;
            
            var matchedNewEvent = newEvents.FirstOrDefault(@event => IsEventIntersects(@event, existingEvent));
            if (matchedNewEvent is null)
                continue;

            if (existingEvent.CreatedDateTimeOffset < matchedNewEvent.CreatedDateTimeOffset)
            {
                await DeleteEvents(newEventsIds, calendarId);
                throw new CalendarBookingRaceConditionException("Some event was created at the same time.");
            }
        }

        bool IsEventIntersects(Event createdEvent, Event existingEvent)
        {
            var start = createdEvent.Start.DateTimeDateTimeOffset;
            var end = createdEvent.End.DateTimeDateTimeOffset;
            var existingStart = existingEvent.Start.DateTimeDateTimeOffset;
            var existingEnd = existingEvent.End.DateTimeDateTimeOffset;
            
            return start >= existingStart && start < existingEnd || 
                   end > existingStart && end <= existingEnd;
        }
    }

    private async Task DeleteEvents(string[] newEventsIds, string calendarId)
    {
        try
        {
            await newEventsIds.Foreach(id => _calendarService.Events.Delete(calendarId, id).ExecuteAsync());
        }
        catch (Exception e)
        {
            Console.WriteLine(e);
            throw;
        }
    }

    private async Task<List<Event>> ReadEvents(string calendarId, DateTime start, DateTime end)
    {
        var allEvents = new List<Event>();
        var eventQuery = _calendarService.Events.List(calendarId);
        eventQuery.TimeMinDateTimeOffset = start;
        eventQuery.TimeMaxDateTimeOffset = end;
        var events = await eventQuery.ExecuteAsync();
        allEvents.AddRange(events.Items);
        while (events.NextPageToken != null)
        {
            eventQuery.PageToken = events.NextPageToken;
            events = await eventQuery.ExecuteAsync();
            allEvents.AddRange(events.Items);
        }

        return allEvents;
    }

    private Event CreateEvent(string username, string email, string activity, DateOnly date, TimeSlot timeSlot, bool isEmailExists)
    {
        return new Event
        {
            Kind = "calendar#event",
            Start = new EventDateTime
            {
                DateTimeDateTimeOffset = new DateTimeOffset(date, timeSlot.Start, TimeSpan.FromHours(3)),
                TimeZone = "Europe/Kyiv"
            },
            End = new EventDateTime
            {
                DateTimeDateTimeOffset = new DateTimeOffset(date, timeSlot.End, TimeSpan.FromHours(3)),
                TimeZone = "Europe/Kyiv"
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
                        Optional = true,
                    }
                }
                : null,
            Summary = $"{activity}",
            Description =
                $"<b>Телеграм</b>\n{username}\nЗв'язатися зі мною:t.me/{username}\n<br>Сервіс з бронювання СпортМайданчику в ЖК \"Нова Англія\" " +
                $"Бронювати <a href=\"https://t.me/new_england_sports_field_bot\">туть</a>",
            Status = "confirmed",
            Transparency = "opaque",
            Visibility = "public",
            Reminders = new Event.RemindersData { UseDefault = true },
            ColorId = GetColorFromActivity(activity),
            Location = "Нова Англія, вулиця Михайла Максимовича, 24, Київ, Україна, 03066",
            GuestsCanModify = false,
            GuestsCanInviteOthers = true,
        };
    }

    private string GetColorFromActivity(string activity)
    {
        var indexOf = Array.IndexOf(Activities.All, activity);
        if (indexOf < 0)
            indexOf = 1;

        return indexOf.ToString();
    }

    public async Task<TimeSpan> GetUsedTime(string userName)
    {
        var used = TimeSpan.Zero;
        await foreach (var userTimeSlot in GetUserBookingAsync(userName))
        {
            used += userTimeSlot.End - userTimeSlot.Start;
        };

        return used;
    }
    
    public async IAsyncEnumerable<UserTimeSlot> GetUserBookingAsync(string userName)
    {
        await Relogin();
        var config = ConfigManager.GetCalendarConfig();
        var eventQuery = _calendarService.Events.List(config.Id);

        eventQuery.TimeMinDateTimeOffset = DateTimeOffset.Now;
        eventQuery.TimeMaxDateTimeOffset = DateTimeOffset.Now.Date.AddDays(config.BookingTimeRange*2);

        var allEvents = new List<Event>();
        var events = await eventQuery.ExecuteAsync();
        allEvents.AddRange(events.Items);
        while (events.NextPageToken != null)
        {
            eventQuery.PageToken = events.NextPageToken;
            events = await eventQuery.ExecuteAsync();
            allEvents.AddRange(events.Items);
        }

        foreach (var @event in allEvents.Where(@event => @event.Description?.Contains(userName) == true))
            yield return new UserTimeSlot(@event.Id, @event.Start.DateTimeDateTimeOffset.Value,
                @event.End.DateTimeDateTimeOffset.Value, @event.Summary);
    }

    public async Task CancelEvents(List<string> selectedEvents)
    {
        await Relogin();

        foreach (var selectedEvent in selectedEvents)
            try
            {
                var config = ConfigManager.GetCalendarConfig();
                await _calendarService.Events.Delete(config.Id, selectedEvent).ExecuteAsync();
            }
            catch (GoogleApiException ex) when (ex.HttpStatusCode == HttpStatusCode.NotFound ||
                                                ex.HttpStatusCode == HttpStatusCode.Gone)
            {
            }
            catch (Exception e)
            {
                _logger.LogError(e, e.Message);
                throw;
            }
    }
}