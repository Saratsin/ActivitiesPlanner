/**
 * CalendarManager - Handles all calendar operations
 */
class CalendarManager {
  constructor(configManager) {
    this.configManager = configManager;
  }

  /**
   * Get calendar by ID with error handling
   * @param {string} calendarId - Calendar ID
   * @param {string} calendarType - Type description for logging
   * @returns {GoogleAppsScript.Calendar.Calendar|null} Calendar object or null
   */
  getCalendar(calendarId, calendarType) {
    const calendar = CalendarApp.getCalendarById(calendarId);
    if (!calendar) {
      Utils.logError(`Calendar access`, `Could not find ${calendarType} calendar with ID: ${calendarId}`);
      return null;
    }
    return calendar;
  }

  /**
   * Get source calendar
   * @returns {GoogleAppsScript.Calendar.Calendar|null} Source calendar or null
   */
  getSourceCalendar() {
    const sourceCalId = this.configManager.getSourceCalendarId();
    return this.getCalendar(sourceCalId, 'source');
  }

  /**
   * Get target calendar
   * @returns {GoogleAppsScript.Calendar.Calendar|null} Target calendar or null
   */
  getTargetCalendar() {
    const targetCalId = this.configManager.getTargetCalendarId();
    return this.getCalendar(targetCalId, 'target');
  }

  /**
   * Extract activity title and description from source event
   * @param {GoogleAppsScript.Calendar.CalendarEvent} sourceEvent - Source event
   * @returns {Object} Extracted data with title, location, and description
   */
  extractEventData(sourceEvent) {
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

  /**
   * Create event in target calendar
   * @param {GoogleAppsScript.Calendar.Calendar} targetCal - Target calendar
   * @param {GoogleAppsScript.Calendar.CalendarEvent} sourceEvent - Source event
   * @param {string} sourceId - Source event ID
   * @returns {GoogleAppsScript.Calendar.CalendarEvent|null} Created event or null
   */
  createTargetEvent(targetCal, sourceEvent, sourceId) {
    try {
      const eventTitle = sourceEvent.getTitle();
      
      // Handle regular events that don't start with 'НА СпортМайданчик'
      if (!eventTitle.startsWith('НА СпортМайданчик')) {
        Utils.logInfo(`Adding new event: "${eventTitle}" (Source ID: ${sourceId})`);
        const newRegTargetEvent = targetCal.createEvent(
          eventTitle,
          sourceEvent.getStartTime(),
          sourceEvent.getEndTime(),
          {
            location: sourceEvent.getLocation() || '',
            description: sourceEvent.getDescription() || '',
            guests: ''
          }
        );
        newRegTargetEvent.setTag(ConfigManager.SOURCE_EVENT_ID_KEY, sourceId);
        return newRegTargetEvent;
      }

      // Handle special sport events
      const eventData = this.extractEventData(sourceEvent);
      Utils.logInfo(`Adding new event: "${eventData.title}" (Source ID: ${sourceId})`);
      
      const newTargetEvent = targetCal.createEvent(
        eventData.title,
        sourceEvent.getStartTime(),
        sourceEvent.getEndTime(),
        {
          location: eventData.location,
          description: eventData.description,
          guests: ''
        }
      );
      
      newTargetEvent.setTag(ConfigManager.SOURCE_EVENT_ID_KEY, sourceId);
      return newTargetEvent;
    } catch (e) {
      Utils.logError(`Calendar event creation (${sourceId})`, e);
      return null;
    }
  }

  /**
   * Delete a calendar event
   * @param {GoogleAppsScript.Calendar.CalendarEvent} event - Event to delete
   * @param {string} sourceId - Associated source ID for logging
   * @returns {boolean} Success status
   */
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

  /**
   * Cancel a specific calendar event for an activity
   * @param {string} activity - Activity name
   * @param {string} activityDateStr - Date string (dd.MM)
   * @returns {boolean} Success status
   */
  cancelEventForActivity(activity, activityDateStr) {
    Utils.logInfo(`Attempting to cancel calendar event instance for ${activity} on ${activityDateStr}.`);

    const calendar = this.getSourceCalendar();
    if (!calendar) {
      return false;
    }

    try {
      const dateParts = activityDateStr.split('.');
      if (dateParts.length !== 2) {
        Utils.logError('Date parsing', `Invalid activityDateStr format: ${activityDateStr}. Expected 'dd.MM'.`);
        return false;
      }
      
      const day = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1;
      const currentYear = new Date().getFullYear();

      const targetDate = new Date(currentYear, month, day);
      targetDate.setHours(0, 0, 0, 0);

      const expectedTitleStart = `НА ${activity}`;
      Utils.logInfo(`Searching for event which title starts with "${expectedTitleStart}" on ${targetDate.toDateString()}.`);

      const events = calendar.getEventsForDay(targetDate);
      let eventDeleted = false;

      if (events.length > 0) {
        Utils.logInfo(`Found ${events.length} event(s) on ${targetDate.toDateString()}. Checking details...`);
        
        for (const event of events) {
          const eventTitle = event.getTitle();
          if (eventTitle.startsWith(expectedTitleStart)) {
            const isRecurring = event.isRecurringEvent();
            Utils.logInfo(`Found matching event (Recurring: ${isRecurring}) with ID: ${event.getId()}. Deleting instance...`);

            try {
              event.deleteEvent();
              eventDeleted = true;
              Utils.logInfo(`Event instance deleted successfully.`);
              break;
            } catch (deleteError) {
              Utils.logError(`Event deletion (${event.getId()})`, deleteError);
            }
          }
        }
      } else {
        Utils.logInfo(`No events found on ${targetDate.toDateString()}.`);
      }

      if (!eventDeleted) {
        Utils.logInfo(`Could not find or delete event instance "${expectedTitleStart}" on ${activityDateStr}.`);
      }

      return eventDeleted;
    } catch (e) {
      Utils.logError(`Calendar event cancellation for ${activity} on ${activityDateStr}`, e);
      return false;
    }
  }

  /**
   * Sync events from source to target calendar
   * @returns {Object} Sync results with added and deleted counts
   */
  syncCalendars() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const future = new Date(now.getTime() + ConfigManager.DAYS_TO_SYNC * 24 * 60 * 60 * 1000);

    Utils.logInfo(`Syncing events from ${now} to ${future}`);

    const sourceCal = this.getSourceCalendar();
    const targetCal = this.getTargetCalendar();
    
    if (!sourceCal || !targetCal) {
      return { added: 0, deleted: 0, error: true };
    }

    const sourceEvents = sourceCal.getEvents(now, future);
    const targetEvents = targetCal.getEvents(now, future);

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
      const sourceId = event.getTag(ConfigManager.SOURCE_EVENT_ID_KEY);
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
        const newEvent = this.createTargetEvent(targetCal, sourceEvent, sourceId);
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
}
