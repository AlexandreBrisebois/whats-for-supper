using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
using Xunit;
using PostgresFact = RecipeApi.Tests.Integration.RecipeImportReportPostgresTests.PostgresFactAttribute;

namespace RecipeApi.Tests.Integration;

public partial class OnlineRecoveryPostgresTests
{
    [PostgresFact]
    public async Task MaintenanceHold_OutlivesPublicationLeaseAndNewScope_BlocksWritesAndWorkersUntilExplicitRemoval()
    {
        using var scope = app.Services.CreateScope();
        var services = scope.ServiceProvider;
        var roots = services.GetRequiredService<RecipesRootResolver>();
        Directory.CreateDirectory(roots.BaseRoot);
        var path = Path.Combine(roots.BaseRoot, ".maintenance-hold.json");
        var gate = services.GetRequiredService<RecoveryBoundary>();
        var db = services.GetRequiredService<RecipeDbContext>();
        var before = await db.FamilyMembers.AsNoTracking().OrderBy(x => x.Id).Select(x => new { x.Id, x.Name }).ToListAsync();
        await using (await gate.EnterAsync(RecoveryAccess.Publish, CancellationToken.None))
            await File.WriteAllTextAsync(path, "{\"operationId\":\"maintenance-test\",\"candidate\":\"selected-commit\"}");

        // The durable intent, not the lifetime of an operator's DB session, owns the hold.
        using var freshScope = app.Services.CreateScope();
        var fresh = freshScope.ServiceProvider.GetRequiredService<RecoveryBoundary>();
        await Assert.ThrowsAsync<RecoveryBusyException>(() => fresh.EnterAsync(RecoveryAccess.Write, CancellationToken.None));
        await Assert.ThrowsAsync<RecoveryBusyException>(() => fresh.EnterAsync(RecoveryAccess.Publish, CancellationToken.None));
        await using (await fresh.EnterAsync(RecoveryAccess.Read, CancellationToken.None)) { }
        await using (await fresh.EnterAsync(RecoveryAccess.Snapshot, CancellationToken.None)) { }

        using var client = app.CreateAuthenticatedClient();
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/family")).StatusCode);
        Assert.Equal(HttpStatusCode.ServiceUnavailable,
            (await client.PostAsJsonAsync("/api/family", new { name = "Must not publish during upgrade" })).StatusCode);
        using var worker = new WorkflowWorker(services.GetRequiredService<IClock>(), app.Services.GetRequiredService<IServiceScopeFactory>(),
            Microsoft.Extensions.Logging.Abstractions.NullLogger<WorkflowWorker>.Instance,
            new RecipeApi.Services.Ai.AiExceptionHandler(services.GetRequiredService<IClock>(), Microsoft.Extensions.Logging.Abstractions.NullLogger<RecipeApi.Services.Ai.AiExceptionHandler>.Instance),
            Microsoft.Extensions.Options.Options.Create(new WorkflowRetryOptions()));
        await Assert.ThrowsAsync<RecoveryBusyException>(() => worker.ProcessPendingTasksAsync(CancellationToken.None));
        await Assert.ThrowsAsync<RecoveryBusyException>(() => services.GetRequiredService<SupperProjectionInvalidation>()
            .ReconcileActivationAsync(fresh, services.GetRequiredService<RecoverySnapshotService>(), CancellationToken.None));
        Assert.Equal(before, await db.FamilyMembers.AsNoTracking().OrderBy(x => x.Id).Select(x => new { x.Id, x.Name }).ToListAsync());

        // Operator removal is allowed only after stopped-app read-back; no timer clears it.
        File.Delete(path);
        await using (await fresh.EnterAsync(RecoveryAccess.Write, CancellationToken.None)) { }
        await services.GetRequiredService<SupperProjectionInvalidation>()
            .ReconcileActivationAsync(fresh, services.GetRequiredService<RecoverySnapshotService>(), CancellationToken.None);
        Assert.Equal(HttpStatusCode.Created, (await client.PostAsJsonAsync("/api/family", new { name = "After verified reopening" })).StatusCode);
    }

    [PostgresFact]
    public async Task MaintenanceHold_MalformedMarkerAndDirectoryFailClosedWithoutBackupConfiguration()
    {
        using var scope = app.Services.CreateScope();
        var services = scope.ServiceProvider;
        var configuration = services.GetRequiredService<IConfiguration>();
        configuration["Recovery:BackupRoot"] = null;
        var roots = services.GetRequiredService<RecipesRootResolver>();
        Directory.CreateDirectory(roots.BaseRoot);
        var path = Path.Combine(roots.BaseRoot, ".maintenance-hold.json");
        var gate = services.GetRequiredService<RecoveryBoundary>();
        foreach (var content in new[] { "", "{broken" })
        {
            await File.WriteAllTextAsync(path, content);
            Assert.True(gate.Enabled);
            await Assert.ThrowsAsync<RecoveryBusyException>(() => gate.EnterAsync(RecoveryAccess.Write, CancellationToken.None));
            await Assert.ThrowsAsync<RecoveryBusyException>(() => gate.EnterAsync(RecoveryAccess.Publish, CancellationToken.None));
            File.Delete(path);
        }
        Directory.CreateDirectory(path);
        try
        {
            Assert.True(gate.Enabled);
            await Assert.ThrowsAsync<RecoveryBusyException>(() => gate.EnterAsync(RecoveryAccess.Write, CancellationToken.None));
        }
        finally { Directory.Delete(path); }
        Assert.False(gate.Enabled);
    }
}
