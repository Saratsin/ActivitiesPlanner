using System.Text.RegularExpressions;
using Microsoft.Extensions.Caching.Memory;
using Newtonsoft.Json;
using Telegram.Bot;
using Telegram.Bot.Types;
using Telegram.Bot.Types.Enums;
using TelegramBot.Configuration;
using TelegramBot.DB;
using TelegramBot.Telegram.Handlers;
using TelegramBot.Telegram.Handlers.Commands;

namespace TelegramBot.Telegram;

public class PrivateChatManager
{
    private static readonly Regex EmailRegex =
        new(
            @"^(([^<>()[\]\\,;:\s@']+(\.[^<>()[\]\\,;:\s@']\s)*)|.('.+'))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$");

    private readonly IConfigManager _configManager;
    private readonly ITelegramBotClient _telegramBot;
    private readonly MainGroupChat _mainGroupChat;
    private readonly ILogger<PrivateChatManager> _logger;
    private readonly IMemoryCache _memoryCache;
    private readonly UsersStore _userStore;
    private readonly IReadOnlyList<ICommandHandler> _commandHandlers;
    private readonly ICommandHandler _unknownCommandHandler;
    private readonly IReadOnlyList<ICallbackQueryHandler> _callbackHandlers;
    private int _pullOffset;

    public PrivateChatManager(IConfigManager configManager,
        ITelegramBotClient telegramBot,
        MainGroupChat mainGroupChat,
        ILogger<PrivateChatManager> logger,
        IMemoryCache memoryCache,
        UsersStore userStore,
        IEnumerable<ICommandHandler> commandHandlers, 
        UnknownCommandHandler unknownCommandHandler,
        IEnumerable<ICallbackQueryHandler> callbackQueryHandlers)
    {
        _configManager = configManager;
        _telegramBot = telegramBot;
        _mainGroupChat = mainGroupChat;
        _logger = logger;
        _memoryCache = memoryCache;
        _userStore = userStore;
        int.TryParse(_configManager.GetProperty("PULL_OFFSET"), out _pullOffset);

        _commandHandlers = commandHandlers.ToArray();
        _unknownCommandHandler = unknownCommandHandler;
        _callbackHandlers = callbackQueryHandlers.ToArray();
    }

    public async Task SetupMenu()
    {
        var commands = new List<BotCommand>
        {
            new("register", "Зареєструватися"),
            new("book", "Забронювати"),
            new("cancel", "Скасувати бронь"),
            new("help", "Допомога")
        };
        await _telegramBot.SetMyCommands(commands, BotCommandScope.AllPrivateChats());
    }

    public async Task PollUpdates(int timeoutSeconds = 5)
    {
        try
        {
            var updates = await _telegramBot.GetUpdates(_pullOffset, 100, timeoutSeconds);

            if (updates.Length == 0)
            {
                _logger.LogInformation("No updates received or error occurred.");
                return;
            }

            await ProcessUpdates(updates);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing updates");
        }
    }

    private async Task ProcessUpdates(Update[] updates)
    {
        foreach (var update in updates) await ProcessUpdate(update);
        _pullOffset = updates.Last().Id + 1;
        _configManager.SetProperty("PULL_OFFSET", _pullOffset.ToString());
    }

    public async Task ProcessUpdate(Update update)
    {
        var message = update?.Message ?? update?.CallbackQuery?.Message;
        var xRay = Guid.NewGuid().ToString();
        var scopeData = new Dictionary<string, object>
        {
            ["Username"] = message.From?.Username ?? "unknown",
            ["UserId"] = message.From?.Id ?? 0,
            ["ChatId"] = message.Chat?.Id ?? 0,
            ["ChatUserName"] = message.Chat.Username ?? "unknown",
            ["XRay"] = xRay
        };

        using (_logger.BeginScope(scopeData))
        {
            try
            {
                var updateLogData = JsonConvert.SerializeObject(update, JsonSetting.Intended);
                var chatType = message?.Chat?.Type;
                if (chatType != ChatType.Private) return;

                if (!await ValidateUserAsync(message, update))
                    return;

                _logger.LogInformation($"Received update {updateLogData}");

                if (update.Message != null)
                {
                    if (string.IsNullOrEmpty(message.Text))
                    {
                        _logger.LogInformation($"Received message without text from {message.From?.Username}");
                        return;
                    }

                    _logger.LogInformation($"Received message: {message.Text} from {message.From?.Username}");
                    if (message.Text.StartsWith("/"))
                        await HandleCommand(update);
                    else if (message.Text.Contains("@"))
                        await HandleEmailMessage(message);
                }
                else if (update.CallbackQuery != null)
                {
                    var callbackQuery = update.CallbackQuery;
                    _logger.LogInformation(
                        $"Received callback query: {callbackQuery.Data} from {callbackQuery.From?.Username}");
                    await HandleCallbackQuery(callbackQuery);
                }


            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing update: {Update}",
                    JsonConvert.SerializeObject(update, JsonSetting.Intended));
                await NotifyAdmins(ex, xRay);
                await SendMessageToUser(update);
            }
        }
    }

    private async Task<bool> ValidateUserAsync(Message message, Update update)
    {
        if (message.From?.IsBot is true && message.From.Username != _configManager.GetBotName())
            return false;

        if (message.Chat.Username is null)
        {
            await _telegramBot.SendMessage(message.Chat.Id,
                "Щоб забронювати майданчик, треба створити унікальне ім'я користувача\r\n" +
                "https://www.youtube.com/watch?v=Q-iZWJ7IwZs");
            return false;
        }

        var isInGroupChat = await _mainGroupChat.IsInGroupChat(message.From.Id);
        if (!isInGroupChat)
        {
            await _telegramBot.SendMessage(message.Chat.Id,
                "Вас нема в чаті спортмайданчику або вас забанили");
            return false;
        }

        // TODO add ban users functionality
        // TODO store in DB with date for unban
        var bannedUsers = _configManager.GetProperty("BANNED_USERS")?.Split(',') ?? Array.Empty<string>();
        if (bannedUsers.Contains(message.From.Id.ToString()) ||
            (message.From.Username != null && bannedUsers.Contains(message.From.Username)))
        {
            await _telegramBot.SendMessage(message.Chat.Id, "Ви заблоковані в цій системі.");
            return false;
        }

        if (update.CallbackQuery is not null || update.Message?.Text == "/book")
        {
            var email = await _userStore.GetEmailAsync(message.Chat.Username);
            if (email is null)
            {
                _logger.LogWarning("Email is null for username: {UserId}", message.Chat.Username);
                await _telegramBot.SendMessage(message.Chat.Id, "Спочатку треба зареєєструвати email для роботи з календарем.\n" +
                                                                "Для цього достатньо його ввести окремим повідомленням");
                return false;
            }    
        }
        
        
        return true;
    }

    private async Task SendMessageToUser(Update update)
    {
        try
        {
            var message = update?.Message ?? update?.CallbackQuery?.Message;
            if (message == null)
                return;

            await _telegramBot.SendMessage(message.Chat.Id, "Сталася помилка, вибачте за незручності");
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Error during user error notification");
        }
    }

    private async Task NotifyAdmins(Exception exception, string xRay = "")
    {
        try
        {
            var adminsChat = _configManager.GetAdminsChats();
            foreach (var chatId in adminsChat) await _telegramBot.SendMessage(chatId, $"Error: {exception.Message}. \r\n XRay :{xRay}");
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Error during admins notification");
        }
    }

    private async Task HandleCommand(Update update)
    {
        var command = update.Message.Text;
        var handler = _commandHandlers.FirstOrDefault(h => h.CanHandle(command)) ?? _unknownCommandHandler;
        await handler.HandleAsync(update);
    }

    private async Task HandleEmailMessage(Message message)
    {
        if (!EmailRegex.IsMatch(message.Text))
        {
            await _telegramBot.SendMessage(message.Chat.Id,
                $"Не вірно введений емейл {message.Text}");
        }
        else
        {
            await _telegramBot.UnpinAllChatMessages(message.Chat.Id);

            _logger.LogInformation($"Email detected: {message.Text}");
            _memoryCache.CreateEntry(message.Chat.Username).Value = message.Text;

            await _telegramBot.PinChatMessage(message.Chat.Id, message.MessageId);
            await _telegramBot.SendMessage(message.Chat.Id,
                $"Ваш емейл {message.Text} успішно зареєстровано. Дякуємо!");

            try
            {
                await _userStore.SaveEmailAsync(message.From.Id, message.From.Username, message.Text);
            }
            catch (Exception e)
            {
                Console.WriteLine(e);
            }
        }
    }

    private async Task HandleCallbackQuery(CallbackQuery callbackQuery)
    {
        _logger.LogInformation($"Handling callback query: {callbackQuery.Data}");
        var type = GetCallbackType(callbackQuery.Data);
        var handler = _callbackHandlers.FirstOrDefault(h => h.CanHandle(type));

        if (handler != null)
            await handler.HandleAsync(callbackQuery);
        else
            _logger.LogInformation($"Unknown callback query type: {type}");
    }

    private static string GetCallbackType(string data)
    {
        if (data == "cancel") return "cancel";
        var buttonData = JsonConvert.DeserializeObject<ButtonData>(data);
        return buttonData?.Type ?? data;
    }

    public async Task SetupWebhook(string url)
    {
        var allowedUpdates = new[] { UpdateType.Message, UpdateType.CallbackQuery, UpdateType.InlineQuery };
        var webhookSecret = _configManager.GetTelegramWebhookSecret();
        await _telegramBot.SetWebhook(url, allowedUpdates: allowedUpdates, secretToken: webhookSecret);
    }
}
