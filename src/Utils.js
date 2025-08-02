/**
 * Utils - Utility functions and helpers
 */
class Utils {
  /**
   * Acquire a script lock with timeout
   * @param {number} timeoutMilliseconds - Timeout in milliseconds
   * @returns {Object} Lock result with success status and lock object
   */
  static acquireScriptLock(timeoutMilliseconds = 20000) {
    const lock = LockService.getScriptLock();
    Utils.logInfo("Attempting to acquire lock...");
    
    const lockAcquired = lock.tryLock(timeoutMilliseconds);
    
    if (!lockAcquired) {
      const errorMessage = `Could not acquire lock after waiting ${timeoutMilliseconds}ms. Another process may be running. Halting execution.`;
      Utils.logError('Lock acquisition', errorMessage);
      throw new Error(errorMessage);
    }
    
    Utils.logInfo("Lock acquired successfully.");
    return { success: true, lock: lock };
  }

  /**
   * Release a script lock safely
   * @param {GoogleAppsScript.Lock.Lock} lock - Lock to release
   */
  static releaseLock(lock) {
    if (lock) {
      lock.releaseLock();
      Utils.logInfo("Lock released.");
    }
  }

  /**
   * Execute function with lock protection
   * @param {Function} func - Function to execute
   * @param {number} timeoutMilliseconds - Lock timeout
   * @returns {*} Function result
   */
  static executeWithLock(func, timeoutMilliseconds = 20000) {
    const lockResult = Utils.acquireScriptLock(timeoutMilliseconds);
    
    try {
      Utils.logInfo("Starting locked execution.");
      const result = func();
      Utils.logInfo("Locked execution completed successfully.");
      return result;
    } catch (error) {
      Utils.logError('Locked execution', error);
      throw error;
    } finally {
      Utils.releaseLock(lockResult.lock);
    }
  }

  /**
   * Format date for logging
   * @param {Date} date - Date to format
   * @returns {string} Formatted date string
   */
  static formatDateForLogging(date) {
    return date.toISOString();
  }

  /**
   * Validate date string format (dd.MM)
   * @param {string} dateStr - Date string to validate
   * @returns {boolean} True if valid format
   */
  static isValidDateString(dateStr) {
    const dateParts = dateStr.split('.');
    if (dateParts.length !== 2) {
      return false;
    }
    
    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10);
    
    return !isNaN(day) && !isNaN(month) && 
           day >= 1 && day <= 31 && 
           month >= 1 && month <= 12;
  }

  /**
   * Parse date string (dd.MM) to Date object
   * @param {string} dateStr - Date string to parse
   * @param {number} [year] - Year (defaults to current year)
   * @returns {Date|null} Parsed date or null if invalid
   */
  static parseDateString(dateStr, year = null) {
    if (!Utils.isValidDateString(dateStr)) {
      return null;
    }
    
    const dateParts = dateStr.split('.');
    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1; // JavaScript months are 0-indexed
    const currentYear = year || new Date().getFullYear();
    
    return new Date(currentYear, month, day);
  }

  /**
   * Log error with context
   * @param {string} context - Error context
   * @param {Error|string} error - Error object or message
   */
  static logError(context, error) {
    Logger.log(`Error in ${context}: ${error}`);
  }

  /**
   * Log info message with timestamp
   * @param {string} message - Info message
   */
  static logInfo(message) {
    Logger.log(`[${new Date().toISOString()}] ${message}`);
  }

  /**
   * Safely parse JSON with error handling
   * @param {string} jsonString - JSON string to parse
   * @param {*} defaultValue - Default value if parsing fails
   * @returns {*} Parsed object or default value
   */
  static safeJsonParse(jsonString, defaultValue = null) {
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      Utils.logError('JSON parsing', e);
      return defaultValue;
    }
  }

  /**
   * Safely stringify object to JSON
   * @param {*} obj - Object to stringify
   * @param {string} defaultValue - Default value if stringifying fails
   * @returns {string} JSON string or default value
   */
  static safeJsonStringify(obj, defaultValue = '{}') {
    try {
      return JSON.stringify(obj);
    } catch (e) {
      Utils.logError('JSON stringifying', e);
      return defaultValue;
    }
  }

  /**
   * Retry function execution with exponential backoff
   * @param {Function} func - Function to retry
   * @param {number} maxRetries - Maximum number of retries
   * @param {number} baseDelay - Base delay in milliseconds
   * @returns {*} Function result
   */
  static retryWithBackoff(func, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return func();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          Utils.logError(`Final retry attempt failed`, error);
          throw error;
        }
        
        const delay = baseDelay * Math.pow(2, attempt);
        Utils.logInfo(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        Utilities.sleep(delay);
      }
    }
    
    throw lastError;
  }
}
