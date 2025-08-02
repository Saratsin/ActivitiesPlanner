# Activities Planner - Refactored Object-Oriented Structure

This project has been refactored from a procedural codebase to a clean, object-oriented architecture. The refactoring improves code maintainability, testability, and clarity while maintaining backward compatibility with existing Google Apps Script triggers.

## New Architecture

### Core Classes

#### 1. `ConfigManager` (`ConfigManager.js`)
- **Purpose**: Centralized configuration and property management
- **Responsibilities**:
  - Manage all application constants and configuration
  - Handle PropertiesService interactions with caching
  - Provide access to environment-specific settings
  - Manage voting schedules and message templates

#### 2. `TelegramBot` (`TelegramBot.js`)
- **Purpose**: Handle all Telegram API interactions
- **Responsibilities**:
  - Make API calls to Telegram
  - Send messages, polls, and manage message operations
  - Handle API error logging and retry logic
  - Provide high-level Telegram operations

#### 3. `CalendarManager` (`CalendarManager.js`)
- **Purpose**: Manage Google Calendar operations
- **Responsibilities**:
  - Sync events between source and target calendars
  - Extract and transform event data
  - Cancel specific calendar events
  - Handle calendar-specific business logic

#### 4. `ActivityScheduler` (`ActivityScheduler.js`)
- **Purpose**: Coordinate poll scheduling and voting logic
- **Responsibilities**:
  - Create and manage voting polls
  - Process poll results and determine outcomes
  - Store and retrieve poll state from properties
  - Handle poll lifecycle management

#### 5. `Utils` (`Utils.js`)
- **Purpose**: Provide utility functions and helpers
- **Responsibilities**:
  - Script lock management for concurrent execution
  - Date parsing and formatting utilities
  - Error handling and logging helpers
  - JSON parsing with safety checks

#### 6. `ActivitiesPlanner` (`ActivitiesPlanner.js`)
- **Purpose**: Main application coordinator
- **Responsibilities**:
  - Initialize and coordinate all components
  - Provide main entry points for triggers
  - Maintain backward compatibility
  - Centralize application flow control

## Benefits of the Refactoring

### 1. **Separation of Concerns**
- Each class has a single, well-defined responsibility
- Business logic is separated from API calls and configuration
- Easier to understand and modify individual components

### 2. **Improved Maintainability**
- Changes to one component don't affect others
- Clear interfaces between components
- Easier to add new features or modify existing ones

### 3. **Better Error Handling**
- Centralized error handling in Utils class
- More robust API error management
- Better logging and debugging capabilities

### 4. **Enhanced Testability**
- Components can be tested in isolation
- Dependencies are injected, making mocking easier
- Clear interfaces make unit testing straightforward

### 5. **Backward Compatibility**
- All existing triggers and function calls continue to work
- Legacy files delegate to new structure
- Gradual migration path for existing deployments

## File Structure

```
src/
├── ActivitiesPlanner.js    # Main application class and entry points
├── ConfigManager.js        # Configuration and properties management
├── TelegramBot.js         # Telegram API interactions
├── CalendarManager.js     # Google Calendar operations
├── ActivityScheduler.js   # Poll scheduling and voting logic
├── Utils.js              # Utility functions and helpers
├── CalendarController.js  # DEPRECATED - backward compatibility
├── TelegramBotController.js # DEPRECATED - backward compatibility
├── Properties.js         # DEPRECATED - backward compatibility
└── appsscript.json       # Google Apps Script configuration
```

## Migration Notes

### Deprecated Files
The following files are kept for backward compatibility but delegate all functionality to the new structure:
- `CalendarController.js` → Delegates to `CalendarManager` and `ActivitiesPlanner`
- `TelegramBotController.js` → Delegates to `ActivityScheduler` and `TelegramBot`
- `Properties.js` → Delegates to `ConfigManager`

### Entry Points
The main entry points for Google Apps Script triggers remain the same:
- `syncCalendars()` - Calendar synchronization (daily trigger)
- `sendVotingPoll()` - Create voting polls (daily trigger)
- `checkPollResults()` - Process poll results (daily trigger)

### Testing Functions
All testing and utility functions are maintained:
- `testSendMessage()` - Test Telegram messaging
- `testSendVotingPollAndStore()` - Test poll creation
- `clearAllPollProperties()` - Clear poll state
- `getAppStatus()` - Get application status

## Usage Examples

### Manual Testing
```javascript
// Get application status
const status = getAppStatus();
Logger.log(status);

// Send test message
testSendMessage();

// Create test poll
testSendVotingPollAndStore();

// Clear all poll data
clearAllPollProperties();
```

### Accessing Components
```javascript
// Get the main application instance
const app = getApp();

// Access individual components
const config = app.configManager;
const telegram = app.telegramBot;
const calendar = app.calendarManager;
const scheduler = app.activityScheduler;
```

## Configuration

All configuration is centralized in the `ConfigManager` class:

- **Poll timing**: `POLL_CREATION_HOUR`, `POLL_CHECK_HOUR`
- **Vote requirements**: `MIN_VOTES_REQUIRED`, `MIN_BASKETBALL_VOTES_REQUIRED`
- **Voting schedule**: `VOTING_SCHEDULE` object with day-specific activities
- **Message templates**: `MESSAGES` object with all user-facing text

## Error Handling

The refactored code includes improved error handling:

- **API calls**: Robust error handling with retry logic
- **Property access**: Safe JSON parsing with defaults
- **Lock management**: Timeout handling for concurrent execution
- **Logging**: Structured logging with context information

## Future Enhancements

The new architecture makes it easy to add:

- **New activities**: Add entries to the voting schedule
- **Different notification methods**: Extend with email or other APIs
- **Enhanced poll types**: Add more complex voting mechanisms
- **Monitoring and analytics**: Add usage tracking and reporting
- **Configuration UI**: Build a web interface for configuration management

## Deployment

1. Ensure all new files are included in your Google Apps Script project
2. Existing triggers will continue to work without modification
3. Test the refactored functionality using the provided test functions
4. Monitor logs to ensure proper operation

The refactoring maintains full backward compatibility, so existing deployments can be updated without interruption to service.
