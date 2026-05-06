using TelegramBot.Telegram;
using TelegramBot.Telegram.Handlers;
using TelegramBot.Telegram.Handlers.Callbacks;
using TelegramBot.Telegram.Handlers.Commands;

namespace TelegramBot.IoC.Modules;

public static class PrivateChatModule
{
    public static IServiceCollection AddPrivateChatModule(this IServiceCollection services)
    {
        services.AddTransient<MessageChainManager>();
        services.AddTransient<BookingKeyboardBuilder>();
        services.AddTransient<MessageDeleter>();

        services.AddTransient<ICommandHandler, BookCommandHandler>();
        services.AddTransient<ICommandHandler, HelpCommandHandler>();
        services.AddTransient<ICommandHandler, RegisterCommandHandler>();
        services.AddTransient<ICommandHandler, CancelCommandHandler>();
        
        services.AddTransient<UnknownCommandHandler, UnknownCommandHandler>();

        services.AddTransient<ICallbackQueryHandler, CancelCallbackHandler>();
        services.AddTransient<ICallbackQueryHandler, SelectActivityCallbackHandler>();
        services.AddTransient<ICallbackQueryHandler, SelectDateCallbackHandler>();
        services.AddTransient<ICallbackQueryHandler, SelectTimeCallbackHandler>();
        services.AddTransient<ICallbackQueryHandler, ConfirmBookingCallbackHandler>();
        services.AddTransient<ICallbackQueryHandler, ConfirmCancelCallbackHandler>();
        
        services.AddTransient<PrivateChatManager>();
        return services;
    }
}