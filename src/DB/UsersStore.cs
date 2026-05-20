using Google.Cloud.Firestore;

namespace TelegramBot.DB;

public class UsersStore
{
    private readonly FirestoreDb _db;

    public UsersStore(IConfiguration configuration)
    {
        var projectId = configuration["GOOGLE_CLOUD_PROJECT"]
                        ?? Environment.GetEnvironmentVariable("GOOGLE_CLOUD_PROJECT") ?? "activitiesplaner";

        _db = FirestoreDb.Create(projectId);
    }

    public async Task SaveEmailAsync(long telegramUserId, string username, string email)
    {
        var doc = _db.Collection("users").Document(telegramUserId.ToString());

        await doc.SetAsync(new
        {
            TelegramUserId = telegramUserId,
            Username = username,
            Email = email,
            UpdatedAt = Timestamp.GetCurrentTimestamp()
        }, SetOptions.MergeAll);
    }

    public async Task<string?> GetEmailAsync(long telegramUserId)
    {
        var doc = _db.Collection("users").Document(telegramUserId.ToString());
        var snapshot = await doc.GetSnapshotAsync();

        if (!snapshot.Exists)
            return null;

        return snapshot.GetValue<string>("Email");
    }

    public async ValueTask<string> GetEmailAsync(string telegramUserId)
    {
        var doc = _db.Collection("users").WhereEqualTo("Username", telegramUserId);
        var snapshot = await doc.GetSnapshotAsync();

        var documentSnapshot = snapshot.Documents.FirstOrDefault();
        if (documentSnapshot?.Exists is not true)
            return null;

        return documentSnapshot.GetValue<string>("Email");
    }
}