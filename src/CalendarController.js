/**
 * The key used for storing the source event ID in the target event's extended properties.
 * Using 'private' makes it not easily visible/searchable via standard UI/API calls.
 */
const SOURCE_EVENT_ID_KEY = 'sourceEventId';

/**
 * How many days into the future to sync events.
 */
const DAYS_TO_SYNC = 7;

/**
 * Syncs events from the source calendar to the target calendar.
 * Adds new events from the source.
 * Deletes events in the target if the corresponding source event is gone.
 * Does NOT update existing events if their details (title, time) change in the source.
 */
function syncCalendars() {
  // Get a lock specific to this script project.
  const lock = LockService.getScriptLock();
  const timeoutMilliseconds = 20000; // 20 seconds timeout for acquiring the lock

  Logger.log("Attempting to acquire lock for syncCalendars...");
  const lockAcquired = lock.tryLock(timeoutMilliseconds);

  // If the lock was NOT acquired, log and throw an error.
  if (!lockAcquired) {
    const errorMessage = `Could not acquire lock after waiting ${timeoutMilliseconds}ms. Another sync process may be running. Halting execution.`;
    Logger.log(errorMessage);
    throw new Error(errorMessage);
  }

  try {
    Logger.log("Lock acquired successfully. Starting sync process.");
    doSyncCalendars();
    Logger.log("Sync process completed successfully.");
  } catch (error) {
    Logger.log(`Error during sync process: ${error}`);
    throw error;
  } finally {
    if (lockAcquired) {
        lock.releaseLock();
        Logger.log("Lock released.");
    }
  }
}

function doSyncCalendars() {
  const now = new Date();
  // Set time to start of the day to avoid timezone/DST issues with fetching across midnight
  now.setHours(0, 0, 0, 0);
  const future = new Date(now.getTime() + DAYS_TO_SYNC * 24 * 60 * 60 * 1000);

  Logger.log(`Syncing events from ${now} to ${future}`);

  // --- 1. Get Calendar Objects ---
  const sourceCalId = getSourceCalendarId();
  const sourceCal = CalendarApp.getCalendarById(sourceCalId);
  if (!sourceCal) {
    Logger.log(`Error: Could not find source calendar with ID: ${sourceCalId}`);
    return;
  }

  const targetCalId = getTargetCalendarId();
  const targetCal = CalendarApp.getCalendarById(targetCalId);
  if (!targetCal) {
    Logger.log(`Error: Could not find target calendar with ID: ${targetCalId}`);
    return;
  }

  // --- 2. Fetch Events ---
  const sourceEvents = sourceCal.getEvents(now, future);
  const targetEvents = targetCal.getEvents(now, future);

  Logger.log(`Found ${sourceEvents.length} events in source calendar.`);
  Logger.log(`Found ${targetEvents.length} events in target calendar (in sync range).`);

  // --- 3. Create Lookups for Efficient Comparison ---

  // Map source event IDs to the source event object
  const sourceEventMap = new Map();
  sourceEvents.forEach(event => {
    // Use event.getId() which is unique within the source calendar
    sourceEventMap.set(`${event.getId()}+${event.getStartTime()}`, event);
  });

  // Map source event IDs (stored in target's properties) to the target event object
  const targetEventMap = new Map();
  // Keep track of target events that *don't* have our special property (maybe manually added)
  const targetEventsWithoutSourceId = [];
  targetEvents.forEach(event => {
    const sourceId = event.getTag(SOURCE_EVENT_ID_KEY);
    if (sourceId) {
      targetEventMap.set(sourceId, event);
    } else {
      targetEventsWithoutSourceId.push(event);
    }
  });

  Logger.log(`Mapped ${sourceEventMap.size} source events.`);
  Logger.log(`Mapped ${targetEventMap.size} target events linked to a source event.`);
  Logger.log(`${targetEventsWithoutSourceId.length} target events found without a source ID link.`);

  // --- 4. Identify and Add New Events ---
  let addedCount = 0;
  sourceEvents.forEach(sourceEvent => {
    const sourceId = `${sourceEvent.getId()}+${sourceEvent.getStartTime()}`;
    if (targetEventMap.has(sourceId)) {
      return;
    }

    // If this source event's ID is NOT found in the target map, it's new!
    try {
      Logger.log(`Adding new event: "${sourceEvent.getTitle()}" (Source ID: ${sourceId})`);

      const eventTitle = sourceEvent.getTitle();
      if (!eventTitle.startsWith('НА СпортМайданчик')) {
        Logger.log(`Adding new event: "${eventTitle}" (Source ID: ${sourceId})`);
        // The 'createEvent' call now uses the variables defined above
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
      
        // IMPORTANT: Tag the new target event with the source event's ID
        newRegTargetEvent.setTag(SOURCE_EVENT_ID_KEY, sourceId);
        addedCount++;
        return;
      }

      // --- START: Data Extraction Logic
      const fullDescription = sourceEvent.getDescription();
      const titleStartMaker = '\n<br><b>Активність (Теніс, Футбол, тощо)</b>\n';
      const titleEndMarker = '\n<br><b>Телеграм</b>\n';
      let titleToCopy = 'Бронь';
      const locationToCopy = sourceEvent.getLocation() || ''; // Copy location, default to empty string if null

      let descriptionToCopy = ''; // Default to empty
      // Define the markers for the substring extraction
      const startMarker = '\n<br><b>Телеграм</b>\n'; // Note the leading newline
      const endMarker = '\n<br>Сервіс з бронювання СпортМайданчику в ЖК "Нова Англія"'; // Note the leading newline

      if (fullDescription) { // Only process if description exists
        Logger.log(fullDescription);
        const startIndex = fullDescription.indexOf(startMarker);
        // Find the end marker *after* the start marker
        const endIndex = fullDescription.indexOf(endMarker, startIndex + startMarker.length); // Search *after* start marker
        
        const titleStartIndex = fullDescription.indexOf(titleStartMaker);
        const titleEndIndex = fullDescription.indexOf(titleEndMarker);

        // Check if both markers found and start is before end
        if (startIndex !== -1 && endIndex !== -1 && titleStartIndex !== -1) {
          titleToCopy = fullDescription.substring(titleStartIndex + titleStartMaker.length, titleEndIndex === -1 ? endIndex : titleEndIndex).trim();
          // Extract the substring from the start marker up to (but not including) the end marker
          descriptionToCopy = fullDescription.substring(startIndex+5, endIndex + endMarker.length) + ' Бронювати <a href="https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ2ZtidqUFIcSRBmf1j2cvLeBPI8h5GO5EMgQm9UhsqXFzwde4HgvBiT4VIUhncYOQs3N7Ybl3No">туть</a>';
          Logger.log(`Extracted title part for event: "${titleToCopy}"`);
        } else {
          // Log if markers weren't found or were in the wrong order relative to each other
          Logger.log(`Description markers not found or out of order for event: "${titleToCopy}". Source ID: ${sourceId}. Storing empty description.`);
          // descriptionToCopy remains ''
        }
      }
      // --- END: Data Extraction Logic ---

      Logger.log(`Adding new event: "${titleToCopy}" (Source ID: ${sourceId})`);
      // The 'createEvent' call now uses the variables defined above
      const newTargetEvent = targetCal.createEvent(
        titleToCopy,
        sourceEvent.getStartTime(),
        sourceEvent.getEndTime(),
        {
          location: locationToCopy,        // Use the copied location
          description: descriptionToCopy,  // Use the extracted description part
          guests: ''                       // Still leave out guests
        }
      );
      
      // IMPORTANT: Tag the new target event with the source event's ID (this line is unchanged but vital)
      newTargetEvent.setTag(SOURCE_EVENT_ID_KEY, sourceId);
      addedCount++;
    } catch (e) {
      Logger.log(`Error creating event for source ID ${sourceId}: ${e}`);
    }
  });

  // --- 5. Identify and Delete Obsolete Events ---
  let deletedCount = 0;
  targetEventMap.forEach((targetEvent, sourceId) => {
    // If a target event's linked source ID is NOT found in the source map, it's obsolete!
    if (!sourceEventMap.has(sourceId)) {
      try {
        Logger.log(`Deleting obsolete event: "${targetEvent.getTitle()}" (Linked Source ID: ${sourceId})`);
        targetEvent.deleteEvent();
        deletedCount++;
      } catch (e) {
        Logger.log(`Error deleting event (ID: ${targetEvent.getId()}, Linked Source ID: ${sourceId}): ${e}`);
        // Log error but continue script
      }
    }
  });

  Logger.log(`Sync complete. Added: ${addedCount}, Deleted: ${deletedCount}.`);
  // Note: Events manually added to the target calendar (targetEventsWithoutSourceId) are ignored and not deleted by this script.
}

/**
 * Finds and deletes a specific instance of a recurring event (or a single event)
 * from the configured Google Calendar.
 * Searches for an event titled "НА [activity]" starting at 18:30 on the given date.
 * @param {string} activity - The name of the activity (e.g., 'Баскетбол').
 * @param {string} activityDateStr - The date string (dd.MM) of the activity.
 */
function cancelCalendarEventForActivity(activity, activityDateStr) {
  Logger.log(`Attempting to cancel calendar event instance for ${activity} on ${activityDateStr}.`);

  const sourceCalendarId = getSourceCalendarId();
  const calendar = CalendarApp.getCalendarById(sourceCalendarId);
  if (!calendar) {
    Logger.log(`Error: Could not find calendar with ID: ${sourceCalendarId}`);
    return;
  }

  try {
    // Parse the date string "dd.MM"
    const dateParts = activityDateStr.split('.');
    if (dateParts.length !== 2) {
      Logger.log(`Error: Invalid activityDateStr format: ${activityDateStr}. Expected 'dd.MM'.`);
      return;
    }
    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1; // JavaScript months are 0-indexed
    const currentYear = new Date().getFullYear(); // Assume current year

    // Construct the specific date object for the target day
    const targetDate = new Date(currentYear, month, day);
    targetDate.setHours(0, 0, 0, 0); // Set to beginning of day for getEventsForDay

    // Construct the expected event title
    const expectedTitleStart = `НА ${activity}`;

    Logger.log(`Searching for event which title starts with "${expectedTitleStart}" on ${targetDate.toDateString()}.`);

    // Get all events occurring on the target day
    const events = calendar.getEventsForDay(targetDate);

    let eventDeleted = false;
    if (events.length > 0) {
      Logger.log(`Found ${events.length} event(s) on ${targetDate.toDateString()}. Checking details...`);
      for (const event of events) {
        const eventStartTime = event.getStartTime();
        const eventTitle = event.getTitle();

        // Check if the title matches and the start time is 18:30
        if (eventTitle.startsWith(expectedTitleStart))
        {
          // Check if it's recurring just for logging purposes
          const isRecurring = event.isRecurringEvent();
          Logger.log(`Found matching event (Recurring: ${isRecurring}) with ID: ${event.getId()}. Deleting instance...`);

          try {
            // Deleting an instance obtained via getEventsForDay deletes only that instance
            event.deleteEvent();
            eventDeleted = true;
            Logger.log(`Event instance deleted successfully.`);
            // Assuming only one event matches exactly, break after deleting
            break;
          } catch (deleteError) {
             Logger.log(`Error deleting event instance ${event.getId()}: ${deleteError}`);
             // Continue checking other events on the day just in case, but log the error
          }
        } else {
          // Log mismatch details for debugging if needed
          Logger.log(`Skipping event: Title "${eventTitle}" (Match: ${eventTitle.startsWith(expectedTitleStart)}), Time ${eventStartTime.getHours()}:${eventStartTime.getMinutes()}`);
        }
      }
    } else {
      Logger.log(`No events found on ${targetDate.toDateString()}.`);
    }

    if (!eventDeleted) {
       Logger.log(`Could not find or delete event instance "${expectedTitleStart}" on ${activityDateStr}.`);
    }

  } catch (e) {
    Logger.log(`Error during calendar event cancellation for ${activity} on ${activityDateStr}: ${e}`);
  }
}