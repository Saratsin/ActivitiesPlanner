class Utils {

  static executeWithLock(func, timeoutMilliseconds = 20000) {
    const lock = LockService.getScriptLock();
    Utils.logInfo("Attempting to acquire lock...");

    const lockAcquired = lock.tryLock(timeoutMilliseconds);
    if (!lockAcquired) {
      const errorMessage = `Could not acquire lock after waiting ${timeoutMilliseconds}ms. Another process may be running. Halting execution`;
      Utils.logError('Lock acquisition', errorMessage);
      throw new Error(errorMessage);
    }

    try {
      Utils.logInfo("Lock acquired successfully. Starting locked execution");
      const result = func();
      return result;
    } catch (error) {
      Utils.logError('Locked execution error occured', error);
      throw error;
    } finally {
      lock.releaseLock();
      Utils.logInfo("Locked execution completed. Lock released");
    }
  }

  static getUkrainianDayOfWeek(date) {
    const ukrainianDays = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
    const dayIndex = date.getDay();
    return ukrainianDays[dayIndex];
  }

  static logError(context, error) {
    Logger.log(`[ERROR] ${new Date().toISOString()} ${context}: ${error}`);
  }

  static logInfo(message) {
    Logger.log(`[INFO] ${new Date().toISOString()}: ${message}`);
  }

  /**
 * Adds time to a date. Modelled after MySQL DATE_ADD function.
 * Example: dateAdd(new Date(), 'minute', 30)  //returns 30 minutes from now.
 * https://stackoverflow.com/a/1214753/18511
 * 
 * @param {Date} date  Date to start with
 * @param {string} interval  One of: year, quarter, month, week, day, hour, minute, second
 * @param {number} units  Number of units of the given interval to add.
 * @returns {Date|undefined}
 */
  static dateAdd(date, interval, units) {
    if (!(date instanceof Date))
      return undefined;
    var ret = new Date(date); //don't change original date
    var checkRollover = function () { if (ret.getDate() != date.getDate()) ret.setDate(0); };
    switch (String(interval).toLowerCase()) {
      case 'year': ret.setFullYear(ret.getFullYear() + units); checkRollover(); break;
      case 'quarter': ret.setMonth(ret.getMonth() + 3 * units); checkRollover(); break;
      case 'month': ret.setMonth(ret.getMonth() + units); checkRollover(); break;
      case 'week': ret.setDate(ret.getDate() + 7 * units); break;
      case 'day': ret.setDate(ret.getDate() + units); break;
      case 'hour': ret.setTime(ret.getTime() + units * 3600000); break;
      case 'minute': ret.setTime(ret.getTime() + units * 60000); break;
      case 'second': ret.setTime(ret.getTime() + units * 1000); break;
      default: ret = undefined; break;
    }
    return ret;
  }

  /**
   * Gets the day name for a date.
   * @param {Date} date - Date object
   * @param {string} [locale='uk-UA'] - Locale string
   * @returns {string} - Day name
   */
  static getDayName(date, locale = 'uk-UA') {
    return date.toLocaleDateString(locale, { weekday: 'long' });
  }

  static convertToUtc(date) {
    if (!(date instanceof Date)) {
      throw new Error('Invalid date');
    }
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  }

  /**
   * Merges overlapping time slots into a single slot.
   * @param {string} date - Date string in YYYY-MM-DD format
   * @param {Array} timeSlots - Array of time slot strings (e.g. "09:00-09:30")
   * @returns {Array} - Array of merged slot objects {from, to}
   */
  static mergeTimeSlots(date, timeSlots) {
    if (!timeSlots || timeSlots.length === 0) {
      return [];
    }

    timeSlots = timeSlots.map(slot => {
      const parts = slot.split('-');
      return {
         from: new Date(`${date}T${parts[0]}:00`),
         to: new Date(`${date}T${parts[1]}:00`)

        // For some reason in local time zone this gives the wrong hour leave the following lines commented if issue will be on production
        // from: Utils.convertToUtc(new Date(`${date}T${parts[0]}:00`)),
        // to: Utils.convertToUtc(new Date(`${date}T${parts[1]}:00`))
      };
    });

    // Merge overlapping time slots
    timeSlots.sort((a, b) => a.from - b.from);
    const merged = [timeSlots[0]];

    for (let i = 1; i < timeSlots.length; i++) {
      const current = timeSlots[i];
      const last = merged[merged.length - 1];

      if (current.from <= last.to) {
        // Overlapping time slots, merge them
        last.to = new Date(Math.max(last.to, current.to));
      } else {
        // Non-overlapping time slot, add to merged list
        merged.push(current);
      }
    }

    return merged;
  }

}
