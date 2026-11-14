using System.Net;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using RecipeApi.Services;
using Xunit;
using PostgresFact = RecipeApi.Tests.Integration.RecipeImportReportPostgresTests.PostgresFactAttribute;

namespace RecipeApi.Tests.Integration;

public partial class OnlineRecoveryPostgresTests
{
    [PostgresFact]
    public async Task FirstInstall_PublicationWaitsForExistingReadWithoutBackupConfiguration()
    {
        using var scope = app.Services.CreateScope();
        scope.ServiceProvider.GetRequiredService<IConfiguration>()["Recovery:BackupRoot"] = null;
        var gate = scope.ServiceProvider.GetRequiredService<RecoveryBoundary>();
        Assert.False(gate.Enabled);
        await using var reader = new NpgsqlConnection(connection);
        await reader.OpenAsync();
        await new NpgsqlCommand("SELECT pg_advisory_lock_shared(244001)", reader).ExecuteNonQueryAsync();
        await Assert.ThrowsAsync<RecoveryBusyException>(async () =>
        {
            await using var unexpected = await gate.EnterAsync(RecoveryAccess.Publish, CancellationToken.None);
        });
    }

    [PostgresFact]
    public async Task FirstInstall_HttpReadWaitsForPublicationWithoutBackupConfiguration()
    {
        using var scope = app.Services.CreateScope();
        scope.ServiceProvider.GetRequiredService<IConfiguration>()["Recovery:BackupRoot"] = null;
        Assert.False(scope.ServiceProvider.GetRequiredService<RecoveryBoundary>().Enabled);
        await using var publisher = new NpgsqlConnection(connection);
        await publisher.OpenAsync();
        await new NpgsqlCommand("SELECT pg_advisory_lock(244001)", publisher).ExecuteNonQueryAsync();
        using var client = app.CreateAuthenticatedClient();
        var response = await client.GetAsync("/api/family");
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("5", Assert.Single(response.Headers.GetValues("Retry-After")));
    }
}
