using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace RecipeApi.Tests.Infrastructure;

internal static class PostgresScript
{
    // A maintained SQL file is literal SQL, including regex braces; EF's
    // ExecuteSqlRaw overload applies composite formatting to parameter syntax.
    internal static async Task ExecuteAsync(DbContext db, string sql)
    {
        await db.Database.OpenConnectionAsync();
        try
        {
            await using var command = db.Database.GetDbConnection().CreateCommand();
            command.CommandText = sql;
            command.Transaction = db.Database.CurrentTransaction?.GetDbTransaction();
            await command.ExecuteNonQueryAsync();
        }
        finally { await db.Database.CloseConnectionAsync(); }
    }
}
