using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;
using PostgresTheory = RecipeApi.Tests.Integration.RecipeImportReportPostgresTests.PostgresTheoryAttribute;

namespace RecipeApi.Tests.Integration;

public partial class OnlineRecoveryPostgresTests
{
    [PostgresTheory]
    [InlineData(false, false)]
    [InlineData(false, true)]
    [InlineData(true, false)]
    [InlineData(true, true)]
    public async Task AlreadySentGroceryWrite_WaitsThroughActualRestore_ThenRejectsOldEpochBeforeReplayOrMutation(bool bulk, bool replay)
    {
        using var scope = app.Services.CreateScope();
        var services = scope.ServiceProvider;
        services.GetRequiredService<IConfiguration>()["Recovery:WaitSeconds"] = "30";
        var db = services.GetRequiredService<RecipeDbContext>();
        var week = services.GetRequiredService<DeploymentCalendar>().Capture(services.GetRequiredService<IClock>().UtcNow).WeekStart(0);
        var rowId = Guid.Parse("05000000-0000-4000-8000-000000000001");
        var rowKey = rowId.ToString("D");
        var row = new GroceryLineItemDto("Onion", "onion", "Produce", null, null, [])
        {
            RowId = rowKey, RowVersion = "1", WeekStartDate = week, DemandIdentity = "retained-recovery-demand"
        };
        db.WeeklyPlans.Add(new WeeklyPlan
        {
            WeekStartDate = week, GroceryListVersion = "1", GroceryItems = JsonSerializer.Serialize(new[] { row }),
            GroceryState = JsonSerializer.Serialize(new Dictionary<string, bool> { [rowKey] = false }),
            GroceryCheckedDemandBaselines = "{}", GroceryDemandEvidence = "{}"
        });
        await db.SaveChangesAsync();
        var route = bulk ? "/api/schedule/0/grocery" : "/api/schedule/0/grocery/item";
        Dictionary<string, object?> Body(Guid mutation, Guid epoch, bool check, string version)
        {
            var body = new Dictionary<string, object?>
            {
                ["weekStartDate"] = week, ["clientMutationId"] = mutation, ["expectedPresentationEpoch"] = epoch
            };
            if (bulk)
            {
                body["expectedListVersion"] = version;
                body["checks"] = new Dictionary<string, bool> { [rowKey] = check };
            }
            else
            {
                body["rowId"] = rowId; body["expectedRowVersion"] = version; body["checked"] = check;
            }
            return body;
        }
        using var client = app.CreateAuthenticatedClient();
        var retainedMutation = Guid.NewGuid();
        var acceptedBody = Body(retainedMutation, Guid.Empty, true, "1");
        using var accepted = await client.PatchAsJsonAsync(route, acceptedBody);
        Assert.Equal(HttpStatusCode.OK, accepted.StatusCode);
        db.ChangeTracker.Clear();
        var sourcePlan = await db.WeeklyPlans.AsNoTracking().SingleAsync();
        var sourceReceipt = await db.GroceryMutationOutcomes.AsNoTracking().SingleAsync();
        Assert.Equal("2", sourcePlan.GroceryListVersion);
        Assert.True(JsonDocument.Parse(sourcePlan.GroceryState).RootElement.GetProperty(row.RowId).GetBoolean());
        var snapshot = await services.GetRequiredService<RecoverySnapshotService>().CaptureAsync(default);
        var checkpoint = new GroceryRestoreHold();
        var restore = new RecoverySnapshotService(db, services.GetRequiredService<RecipesRootResolver>(),
            services.GetRequiredService<DataRootResolver>(), services.GetRequiredService<IConfiguration>(),
            services.GetRequiredService<IClock>(), services.GetRequiredService<RecoveryBoundary>(),
            services.GetRequiredService<FoodVocabularyStore>(), services.GetRequiredService<HouseholdFoodOverrideStore>(), checkpoint);
        var restoring = restore.RestoreExactAsync(snapshot.SnapshotId!.Value, default);
        Task<HttpResponseMessage>? waiting = null;
        try
        {
            await checkpoint.Entered.Task.WaitAsync(TimeSpan.FromSeconds(15));
            // This is an actual sent HTTP request. PostgreSQL must show it waiting
            // behind the restore's exclusive publication lease before we proceed.
            waiting = client.PatchAsJsonAsync(route, replay ? acceptedBody : Body(Guid.NewGuid(), Guid.Empty, false, "2"));
            using var deadline = new CancellationTokenSource(TimeSpan.FromSeconds(15));
            while (true)
            {
                await using var query = new NpgsqlCommand("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=@database AND wait_event='advisory')", admin);
                query.Parameters.AddWithValue("database", database);
                if ((bool)(await query.ExecuteScalarAsync(deadline.Token))!) break;
                await Task.Delay(10, deadline.Token);
            }
            Assert.False(waiting.IsCompleted);
        }
        finally
        {
            checkpoint.Release.TrySetResult();
            await restoring;
        }
        Assert.Equal("completed", (await restoring).State);
        using var refused = await waiting!;
        Assert.Equal(HttpStatusCode.Conflict, refused.StatusCode);
        Assert.Equal("epoch_conflict", (await refused.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString());

        db.ChangeTracker.Clear();
        var restored = await db.WeeklyPlans.AsNoTracking().SingleAsync();
        Assert.Equal(sourcePlan.GroceryState, restored.GroceryState);
        Assert.Equal(sourcePlan.GroceryItems, restored.GroceryItems);
        Assert.Equal(sourcePlan.GroceryListVersion, restored.GroceryListVersion);
        Assert.Equal(sourcePlan.GroceryCheckedDemandBaselines, restored.GroceryCheckedDemandBaselines);
        var outcome = await db.GroceryMutationOutcomes.AsNoTracking().SingleAsync();
        Assert.Equal(sourceReceipt.Id, outcome.Id);
        Assert.Equal(sourceReceipt.InputHash, outcome.InputHash);
        Assert.Equal(sourceReceipt.Outcome, outcome.Outcome);
        var generation = services.GetRequiredService<RecipesRootResolver>().Generation;
        Assert.NotNull(generation);
        var newEpoch = (await services.GetRequiredService<FoodVocabularyStore>().CapturePresentationAsync([])).Epoch;
        Assert.Equal(Guid.ParseExact(generation, "N"), newEpoch);
        Assert.NotEqual(Guid.Empty, newEpoch);

        // A new explicit action uses the freshly observed generation and the
        // restored row/list version; the refused intention is never replayed.
        using var fresh = await client.PatchAsJsonAsync(route, Body(Guid.NewGuid(), newEpoch, false, "2"));
        Assert.Equal(HttpStatusCode.OK, fresh.StatusCode);
        db.ChangeTracker.Clear();
        var final = await db.WeeklyPlans.AsNoTracking().SingleAsync();
        Assert.Equal("3", final.GroceryListVersion);
        Assert.False(JsonDocument.Parse(final.GroceryState).RootElement.GetProperty(row.RowId).GetBoolean());
        Assert.Equal(2, await db.GroceryMutationOutcomes.CountAsync());
    }

    private sealed class GroceryRestoreHold : IRecoveryCheckpoint
    {
        public TaskCompletionSource Entered { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource Release { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public async Task ReachedAsync(string name, CancellationToken ct)
        {
            if (name != "journal") return;
            Entered.TrySetResult();
            await Release.Task.WaitAsync(TimeSpan.FromSeconds(30), ct);
        }
    }
}
