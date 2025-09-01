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
}
