class CalendarManager {
  constructor(configManager) {
    this.configManager = configManager;
  }

  getBookingsCalendar() {
    const bookingsCalendarId = this.configManager.getBookingsCalendarId();
    return CalendarApp.getCalendarById(bookingsCalendarId);
  }

  createTargetEvent(bookingsCalendar, sourceEvent, sourceId) {
    try {
      const eventTitle = sourceEvent.getTitle();
      
      // Handle group events that don't start with 'НА СпортМайданчик'
      if (!eventTitle.startsWith('НА СпортМайданчик')) {
        Utils.logInfo(`Adding new group event: "${eventTitle}" (Source ID: ${sourceId})`);
        const newGroupTargetEvent = bookingsCalendar.createEvent(
          eventTitle,
          sourceEvent.getStartTime(),
          sourceEvent.getEndTime(),
          {
            location: sourceEvent.getLocation() || '',
            description: sourceEvent.getDescription() || '',
            guests: ''
          }
        );
        newGroupTargetEvent.setTag(CONFIG_SOURCE_EVENT_ID_KEY, sourceId);
        return newGroupTargetEvent;
      }

      // Handle old booking sport events
      const eventData = this.extractOldBookingEventData(sourceEvent);
      Utils.logInfo(`Adding new event: "${eventData.title}" (Source ID: ${sourceId})`);
      
      const newTargetEvent = bookingsCalendar.createEvent(
        eventData.title,
        sourceEvent.getStartTime(),
        sourceEvent.getEndTime(),
        {
          location: eventData.location,
          description: eventData.description,
          guests: ''
        }
      );
      
      newTargetEvent.setTag(CONFIG_SOURCE_EVENT_ID_KEY, sourceId);
      return newTargetEvent;
    } catch (e) {
      Utils.logError(`Calendar event creation (${sourceId})`, e);
      return null;
    }
  }

  //TODO Rewrite it to use just event id
  deleteEventById(eventId) {
    const calendar = this.getSourceCalendar();
    if (!calendar) {
      return false;
    }

    const event = calendar.getEventById(eventId);
    if (!event) {
      return false;
    }

    event.deleteEvent();

    return true;
  }

  getNextGroupEventData(currentDateTime) {
    const startDateTimeToCheck = currentDateTime;
    const endDateTimeToCheck = new Date(startDateTimeToCheck.getTime() + 24 * 60 * 60 * 1000);
    const bookingsCalendar = this.getBookingsCalendar();
    
    const events = bookingsCalendar.getEvents(startDateTimeToCheck, endDateTimeToCheck);
    Utils.logInfo(`Found ${events.length} events in bookings calendar for the next 24 hours.`);
    
    const groupEvent = events
      .filter(event => event.getStartTime() > startDateTimeToCheck)
      // TODO Replace with single 'НА ' after migration to the telegram bot reservations
      .find(event => event.getTitle().startsWith('НА ') && !event.getTitle().startsWith('НА СпортМайданчик'));

    if (!groupEvent) {
      Utils.logInfo('No group activity event found.');
      return null;
    }

    const eventId = groupEvent.getId();
    const eventTitle = groupEvent.getTitle();
    const eventDescription = groupEvent.getDescription();
    const eventStartDateTime = groupEvent.getStartTime();
    const eventEndDateTime = groupEvent.getEndTime();
    
    const pollCreationData = this.extractDataFromText(eventDescription, 'Початок голосуванння: ', '<br>');
    const pollVotesCountingData = this.extractDataFromText(eventDescription, 'Кінець голосування: ', '<br>');
    const minPositiveVotersCountData = this.extractDataFromText(eventDescription, 'Мінімальна кількість голосів за: ', '<br>');
    
    const pollCreationDate = this.parseCalendarDescriptionDate(eventStartDateTime, pollCreationData);
    const pollVotesCountingDate = this.parseCalendarDescriptionDate(eventStartDateTime, pollVotesCountingData);
    const minPositiveVotersCount = parseInt(minPositiveVotersCountData);
    
    Utils.logInfo(`Found group activity event: "${eventTitle}" at ${eventStartDateTime}`);
    
    return new GroupEventData(
      eventId,
      eventTitle,
      eventDescription,
      eventStartDateTime,
      eventEndDateTime,
      pollCreationDate,
      pollVotesCountingDate,
      minPositiveVotersCount
    );
  }

  parseCalendarDescriptionDate(eventStartDateTime, calendarDateTimeData) {
    const timeData = calendarDateTimeData.substring(0, 5).split(':');
    const dateData = calendarDateTimeData.substring(6);
    
    const dateShift = dateData === 'в попередній день' ? -1 : 0;
    const timeHours = parseInt(timeData[0]);
    const timeMinutes = parseInt(timeData[1]);

    const eventStartDate = new Date(eventStartDateTime);
    eventStartDate.setHours(0, 0, 0, 0);

    const calendarDescriptionDate = new Date(eventStartDate.getTime() + ((dateShift * 24 + timeHours) * 60 + timeMinutes) * 60 * 1000 );
    return calendarDescriptionDate;
  }

  extractDataFromText(text, startMarker, endMarker) {
    const startIndex = text.indexOf(startMarker);
    const endIndex = text.indexOf(endMarker, startIndex + startMarker.length);
    return text.substring(startIndex + startMarker.length, endIndex);
  }


  // TODO Remove calendars syncing after the telegram bot migration


  extractOldBookingEventData(sourceEvent) {
    const fullDescription = sourceEvent.getDescription();
    const titleStartMarker = '\n<br><b>Активність (Теніс, Футбол, тощо)</b>\n';
    const titleEndMarker = '\n<br><b>Телеграм</b>\n';
    let titleToCopy = 'Бронь';
    const locationToCopy = sourceEvent.getLocation() || '';

    let descriptionToCopy = '';
    const startMarker = '\n<br><b>Телеграм</b>\n';
    const endMarker = '\n<br>Сервіс з бронювання СпортМайданчику в ЖК "Нова Англія"';

    if (fullDescription) {
      Utils.logInfo(`Processing event description: ${fullDescription.substring(0, 100)}...`);
      const startIndex = fullDescription.indexOf(startMarker);
      const endIndex = fullDescription.indexOf(endMarker, startIndex + startMarker.length);
      const titleStartIndex = fullDescription.indexOf(titleStartMarker);
      const titleEndIndex = fullDescription.indexOf(titleEndMarker);

      if (startIndex !== -1 && endIndex !== -1 && titleStartIndex !== -1) {
        titleToCopy = fullDescription.substring(titleStartIndex + titleStartMarker.length, titleEndIndex === -1 ? endIndex : titleEndIndex).trim();
        descriptionToCopy = fullDescription.substring(startIndex + 5, endIndex + endMarker.length) + ' Бронювати <a href="https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ2ZtidqUFIcSRBmf1j2cvLeBPI8h5GO5EMgQm9UhsqXFzwde4HgvBiT4VIUhncYOQs3N7Ybl3No">туть</a>';
        Utils.logInfo(`Extracted title part for event: "${titleToCopy}"`);
      } else {
        Utils.logInfo(`Description markers not found or out of order for event: "${titleToCopy}". Storing empty description.`);
      }
    }

    return {
      title: titleToCopy,
      location: locationToCopy,
      description: descriptionToCopy
    };
  }

  syncCalendars() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const future = new Date(now.getTime() + CONFIG_DAYS_TO_SYNC * 24 * 60 * 60 * 1000);

    Utils.logInfo(`Syncing events from ${now} to ${future}`);

    const sourceCal = this.getSourceCalendar();
    const bookingsCalendar = this.getBookingsCalendar();
    
    if (!sourceCal || !bookingsCalendar) {
      return { added: 0, deleted: 0, error: true };
    }

    const sourceEvents = sourceCal.getEvents(now, future);
    const targetEvents = bookingsCalendar.getEvents(now, future);

    Utils.logInfo(`Found ${sourceEvents.length} events in source calendar.`);
    Utils.logInfo(`Found ${targetEvents.length} events in target calendar (in sync range).`);

    // Create lookup maps
    const sourceEventMap = new Map();
    sourceEvents.forEach(event => {
      sourceEventMap.set(`${event.getId()}+${event.getStartTime()}`, event);
    });

    const targetEventMap = new Map();
    const targetEventsWithoutSourceId = [];
    targetEvents.forEach(event => {
      const sourceId = event.getTag(CONFIG_SOURCE_EVENT_ID_KEY);
      if (sourceId) {
        targetEventMap.set(sourceId, event);
      } else {
        targetEventsWithoutSourceId.push(event);
      }
    });

    Utils.logInfo(`Mapped ${sourceEventMap.size} source events.`);
    Utils.logInfo(`Mapped ${targetEventMap.size} target events linked to a source event.`);
    Utils.logInfo(`${targetEventsWithoutSourceId.length} target events found without a source ID link.`);

    // Add new events
    let addedCount = 0;
    sourceEvents.forEach(sourceEvent => {
      const sourceId = `${sourceEvent.getId()}+${sourceEvent.getStartTime()}`;
      if (!targetEventMap.has(sourceId)) {
        const newEvent = this.createTargetEvent(bookingsCalendar, sourceEvent, sourceId);
        if (newEvent) {
          addedCount++;
        }
      }
    });

    // Delete obsolete events
    let deletedCount = 0;
    targetEventMap.forEach((targetEvent, sourceId) => {
      if (!sourceEventMap.has(sourceId)) {
        if (this.deleteEvent(targetEvent, sourceId)) {
          deletedCount++;
        }
      }
    });

    Utils.logInfo(`Sync complete. Added: ${addedCount}, Deleted: ${deletedCount}.`);
    return { added: addedCount, deleted: deletedCount, error: false };
  }
  
  getSourceCalendar() {
    const sourceCalId = this.configManager.getSourceCalendarId();
    return CalendarApp.getCalendarById(sourceCalId);
  }

  deleteEvent(event, sourceId) {
    try {
      Utils.logInfo(`Deleting obsolete event: "${event.getTitle()}" (Linked Source ID: ${sourceId})`);
      event.deleteEvent();
      return true;
    } catch (e) {
      Utils.logError(`Calendar event deletion (ID: ${event.getId()}, Linked Source ID: ${sourceId})`, e);
      return false;
    }
  }
}