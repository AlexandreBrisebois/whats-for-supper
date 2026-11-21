using System.Data;
using Microsoft.EntityFrameworkCore;

namespace RecipeApi.Services;

internal static class DatabaseReadConnection
{
    // A complete absence inventory issues several queries. Retain one EF-owned
    // connection across them, including nested captures, without taking ownership
    // of an already-open caller connection or transaction.
    internal static async Task<IAsyncDisposable> RetainAsync(Data.RecipeDbContext db, CancellationToken ct)
    {
        if (!db.Database.IsNpgsql() || db.Database.GetDbConnection().State == ConnectionState.Open)
            return new UnownedReadConnection();
        await db.Database.OpenConnectionAsync(ct);
        return new OwnedReadConnection(db);
    }

    private sealed class UnownedReadConnection : IAsyncDisposable
    {
        public ValueTask DisposeAsync() => ValueTask.CompletedTask;
    }

    private sealed class OwnedReadConnection(Data.RecipeDbContext context) : IAsyncDisposable
    {
        public async ValueTask DisposeAsync() => await context.Database.CloseConnectionAsync();
    }
}
