using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using PostgresTheory = RecipeApi.Tests.Integration.RecipeImportReportPostgresTests.PostgresTheoryAttribute;

namespace RecipeApi.Tests.Integration;

public sealed class GroceryMutationLeasePostgresTests(Xunit.Abstractions.ITestOutputHelper output)
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task HttpGroceryWrite_DrainsBeforeAQueuedSnapshotWithoutTakingAnotherWriteLease() =>
        new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            var admitted = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            var proceed = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(
                new DeploymentCalendarIntegrationTests.CalendarClock(), new()
                {
                    ["Tests:PostgresConnectionString"] = settings.ConnectionString,
                    ["Recovery:WaitSeconds"] = "30"
                }, configureApplication: application => application.Use(async (context, next) =>
                {
                    if (context.Request.Path == "/api/schedule/0/grocery/item")
                    {
                        // Recovery middleware already admitted this actual HTTP
                        // request. Pause before the service acquires its fence.
                        admitted.TrySetResult();
                        await proceed.Task.WaitAsync(TimeSpan.FromSeconds(15), context.RequestAborted);
                    }
                    await next(context);
                }));
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var week = scope.ServiceProvider.GetRequiredService<DeploymentCalendar>()
                .Capture(scope.ServiceProvider.GetRequiredService<IClock>().UtcNow).WeekStart(0);
            var rowId = Guid.Parse("05000000-0000-4000-8000-000000000021");
            var row = new GroceryLineItemDto("Onion", "onion", "Produce", null, null, [])
            {
                RowId = rowId.ToString("D"), RowVersion = "1", WeekStartDate = week, DemandIdentity = "snapshot-wait-demand"
            };
            db.WeeklyPlans.Add(new WeeklyPlan
            {
                WeekStartDate = week, GroceryListVersion = "1", GroceryItems = JsonSerializer.Serialize(new[] { row }),
                GroceryState = "{}", GroceryCheckedDemandBaselines = "{}", GroceryDemandEvidence = "{}"
            });
            await db.SaveChangesAsync();
            using var client = factory.CreateAuthenticatedClient();
            var request = client.PatchAsJsonAsync("/api/schedule/0/grocery/item", new
            {
                rowId, weekStartDate = week, expectedRowVersion = "1", @checked = true,
                clientMutationId = Guid.NewGuid(), expectedPresentationEpoch = Guid.Empty
            });
            Task<IAsyncDisposable>? snapshot = null;
            try
            {
                await admitted.Task.WaitAsync(TimeSpan.FromSeconds(15));
                snapshot = scope.ServiceProvider.GetRequiredService<RecoveryBoundary>().EnterAsync(RecoveryAccess.Snapshot, default);
                await WaitForSnapshot(settings.ConnectionString);
                Assert.False(snapshot.IsCompleted);
                // The queued snapshot has the longer deadline. A second write
                // lease inside the HTTP request must not block behind it.
                factory.Services.GetRequiredService<IConfiguration>()["Recovery:WaitSeconds"] = "2";
                proceed.TrySetResult();
                using var response = await request.WaitAsync(TimeSpan.FromSeconds(10));
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
                _ = await snapshot.WaitAsync(TimeSpan.FromSeconds(10));
                db.ChangeTracker.Clear();
                var saved = await db.WeeklyPlans.AsNoTracking().SingleAsync();
                Assert.True(JsonDocument.Parse(saved.GroceryState).RootElement.GetProperty(rowId.ToString("D")).GetBoolean());
                Assert.Single(await db.GroceryMutationOutcomes.AsNoTracking().ToArrayAsync());
            }
            finally
            {
                proceed.TrySetResult();
                using var response = await request;
                if (snapshot is not null) await (await snapshot).DisposeAsync();
            }
        });

    [PostgresTheory]
    [InlineData(false)]
    [InlineData(true)]
    public Task RetainedWork_KeepsTheLeaseAlive_AndIndependentLogicalFlowsAcquireTheirOwnLease(bool independentFlow) =>
        new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            var admitted = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            var respond = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            IAsyncDisposable? retained = null;
            await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(configurationOverrides: new()
            {
                ["Tests:PostgresConnectionString"] = settings.ConnectionString,
                ["Recovery:WaitSeconds"] = "30"
            }, configureApplication: application => application.MapPost("/api/test/recovery-lease", async (RecoveryBoundary boundary, CancellationToken ct) =>
            {
                if (independentFlow)
                {
                    Task<IAsyncDisposable> acquire;
                    using (ExecutionContext.SuppressFlow())
                        acquire = Task.Run(() => boundary.EnterAsync(RecoveryAccess.Write, ct));
                    retained = await acquire;
                }
                else retained = await boundary.EnterAsync(RecoveryAccess.Write, ct);
                admitted.TrySetResult();
                await respond.Task.WaitAsync(TimeSpan.FromSeconds(15), ct);
                return Results.Ok();
            }));
            using var client = factory.CreateAuthenticatedClient();
            var request = client.PostAsync("/api/test/recovery-lease", null);
            Task<IAsyncDisposable>? snapshot = null;
            try
            {
                await admitted.Task.WaitAsync(TimeSpan.FromSeconds(15));
                await using var observer = new NpgsqlConnection(settings.ConnectionString);
                await observer.OpenAsync();
                await using var query = new NpgsqlCommand("SELECT count(DISTINCT pid)::int FROM pg_locks WHERE locktype='advisory' AND database=(SELECT oid FROM pg_database WHERE datname=current_database()) AND classid=0 AND objid=244002 AND mode='ShareLock' AND granted", observer);
                Assert.Equal(independentFlow ? 2 : 1, (int)(await query.ExecuteScalarAsync())!);
                respond.TrySetResult();
                using var response = await request.WaitAsync(TimeSpan.FromSeconds(10));
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);

                using var scope = factory.Services.CreateScope();
                snapshot = scope.ServiceProvider.GetRequiredService<RecoveryBoundary>().EnterAsync(RecoveryAccess.Snapshot, default);
                await WaitForSnapshot(settings.ConnectionString);
                Assert.False(snapshot.IsCompleted);
                await retained!.DisposeAsync();
                await retained.DisposeAsync(); // Each handle releases its reference once.
                retained = null;
                _ = await snapshot.WaitAsync(TimeSpan.FromSeconds(10));
            }
            finally
            {
                respond.TrySetResult();
                using var response = await request;
                if (retained is not null) await retained.DisposeAsync();
                if (snapshot is not null) await (await snapshot).DisposeAsync();
            }
        });

    [PostgresTheory]
    [InlineData("GET", RecoveryAccess.Write)]
    [InlineData("POST", RecoveryAccess.Snapshot)]
    [InlineData("POST", RecoveryAccess.Publish)]
    public Task BoundRequestLease_RefusesUpgradeOrNestedPublication(string method, RecoveryAccess requested) =>
        new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(configurationOverrides: new()
            {
                ["Tests:PostgresConnectionString"] = settings.ConnectionString
            }, configureApplication: application => application.MapMethods("/api/test/recovery-upgrade", [method], async (RecoveryBoundary boundary, CancellationToken ct) =>
            {
                try
                {
                    await using var unexpected = await boundary.EnterAsync(requested, ct);
                    return Results.Json(new { refused = false });
                }
                catch (InvalidOperationException) { return Results.Json(new { refused = true }); }
            }));
            using var client = factory.CreateAuthenticatedClient();
            using var request = new HttpRequestMessage(new HttpMethod(method), "/api/test/recovery-upgrade");
            using var response = await client.SendAsync(request);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.True((await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("refused").GetBoolean());
        });

    private static async Task WaitForSnapshot(string connection)
    {
        await using var observer = new NpgsqlConnection(connection);
        await observer.OpenAsync();
        using var deadline = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        while (true)
        {
            await using var query = new NpgsqlCommand("SELECT EXISTS(SELECT 1 FROM pg_locks WHERE locktype='advisory' AND database=(SELECT oid FROM pg_database WHERE datname=current_database()) AND classid=0 AND objid=244002 AND mode='ExclusiveLock' AND NOT granted)", observer);
            if ((bool)(await query.ExecuteScalarAsync(deadline.Token))!) return;
            await Task.Delay(10, deadline.Token);
        }
    }

    [PostgresTheory]
    [InlineData(RecoveryAccess.Read)]
    [InlineData(RecoveryAccess.Write)]
    [InlineData(RecoveryAccess.Snapshot)]
    [InlineData(RecoveryAccess.Publish)]
    public Task ActualSnapshotCapture_BorrowsOnlyReadsOnItsHeldSession(RecoveryAccess requested) =>
        new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            var backup = Path.Combine(Path.GetTempPath(), "wfs-snapshot-borrow-" + Guid.NewGuid().ToString("N"));
            try
            {
                await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(configurationOverrides: new()
                {
                    ["Tests:PostgresConnectionString"] = settings.ConnectionString,
                    ["Tests:LocalRecipeStore"] = "true",
                    ["Recovery:BackupRoot"] = backup
                });
                using var scope = factory.Services.CreateScope();
                var services = scope.ServiceProvider;
                var boundary = services.GetRequiredService<RecoveryBoundary>();
                var reached = false;
                var checkpoint = new SnapshotLeaseCheckpoint(async ct =>
                {
                    reached = true;
                    if (requested != RecoveryAccess.Read)
                    {
                        await Assert.ThrowsAsync<InvalidOperationException>(() => boundary.EnterAsync(requested, ct));
                        return;
                    }
                    await using var read = await boundary.EnterAsync(RecoveryAccess.Read, ct);
                    await using var observer = new NpgsqlConnection(settings.ConnectionString);
                    await observer.OpenAsync(ct);
                    await using var query = new NpgsqlCommand("SELECT count(DISTINCT pid)::int FROM pg_locks WHERE locktype='advisory' AND database=(SELECT oid FROM pg_database WHERE datname=current_database()) AND classid=0 AND objid=244001 AND mode='ShareLock' AND granted", observer);
                    Assert.Equal(1, (int)(await query.ExecuteScalarAsync(ct))!);
                });
                var recovery = new RecoverySnapshotService(services.GetRequiredService<RecipeDbContext>(),
                    services.GetRequiredService<RecipesRootResolver>(), services.GetRequiredService<DataRootResolver>(),
                    services.GetRequiredService<IConfiguration>(), services.GetRequiredService<IClock>(), boundary,
                    services.GetRequiredService<FoodVocabularyStore>(), services.GetRequiredService<HouseholdFoodOverrideStore>(), checkpoint);
                Assert.Equal("completed", (await recovery.CaptureAsync(default)).State);
                Assert.True(reached);
            }
            finally { if (Directory.Exists(backup)) Directory.Delete(backup, true); }
        });

    private sealed class SnapshotLeaseCheckpoint(Func<CancellationToken, Task> callback) : IRecoveryCheckpoint
    {
        public Task ReachedAsync(string name, CancellationToken ct) => name == "capture-locked" ? callback(ct) : Task.CompletedTask;
    }
}
