using System.Data.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

public sealed class WorkflowLaunchIntentPostgresTests(ITestOutputHelper output)
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task Worker_ReconcilesGenericOriginalBeforeDispatch() => new TomorrowPushPostgresTests(output)
        .WithDatabase(settings => Services.WorkflowLaunchIntentTests.CheckWorkerRecoveryAsync(builder => builder.UseNpgsql(settings.ConnectionString)));

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task LostRequestAcknowledgement_RetainsUnqualifiedOriginal() => CheckAsync("request", false);

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task LostPreparedAcknowledgement_ReconcilesOriginalWithoutRecapture() => CheckAsync("prepared", false);

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task LostAcceptanceAcknowledgement_ReadsOriginalReceipt() => CheckAsync("accepted", false);

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task FailedAcceptanceCommit_RetainsPreparedOriginal_AndConcurrentRecoveryAcceptsOnce() => CheckAsync("accepted", true);

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task HouseholdRecoveryPublication_RetainsButFencesOriginalPreparedLaunch() => CheckAsync("prepared", false, true);

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task FailedRequestCommit_DoesNotLeakIntentThroughUnrelatedSave() => CheckAsync("request", true);

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task FailedPreparedCommit_DoesNotManufactureCaptureOnRetry() => CheckAsync("prepared", true);

    private async Task CheckAsync(string stage, bool rollback, bool changedGeneration = false)
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            RecipeDbContext Context() => new(new DbContextOptionsBuilder<RecipeDbContext>().UseNpgsql(settings.ConnectionString).Options);
            var observer = new CommitFailure(stage, rollback);
            await using var db = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>()
                .UseNpgsql(settings.ConnectionString).AddInterceptors(observer).Options);
            var recipe = new Recipe { Id = Guid.NewGuid(), SourceUrl = "https://example.invalid/original" };
            db.Recipes.Add(recipe);
            db.RecipeImportReports.Add(new RecipeImportReport { RecipeId = recipe.Id, Reasons = ["ingredients"], Note = null });
            await db.SaveChangesAsync();
            var storage = new InMemoryStorageProvider();
            await new RecipeRepository(storage).SaveInfoAsync(new RecipeInfo { Id = recipe.Id, SourceUrl = recipe.SourceUrl }, default);
            await storage.SaveAsync("workflows", "url-import.yaml", """
                name: url-import
                parameters: [recipeId, url]
                tasks:
                  - name: fetch
                    processor: FetchUrlContent
                    payload:
                      recipeId: "{{recipeId}}"
                """);
            var clock = new SystemClock();
            WorkflowOrchestrator Orchestrator(RecipeDbContext context) => new(clock, new WorkflowRepository(storage), context,
                TestPublicationStore.Create(context, storage, clock));
            var id = Guid.NewGuid();
            var parameters = new Dictionary<string, string> { ["recipeId"] = recipe.Id.ToString(), ["url"] = recipe.SourceUrl };
            if (stage == "accepted" && !rollback)
                Assert.Equal(id, (await Orchestrator(db).TriggerImportAsync(id, recipe.Id, "url-import", parameters)).Id);
            else
                await Assert.ThrowsAsync<IOException>(() => Orchestrator(db).TriggerImportAsync(id, recipe.Id, "url-import", parameters));

            Assert.True(observer.Fired);
            await using var before = Context();
            if (stage == "request" && rollback)
            {
                Assert.Empty(await before.WorkflowLaunchIntents.ToListAsync());
                recipe.Description = "Unrelated later save";
                await db.SaveChangesAsync();
                Assert.Empty(await before.WorkflowLaunchIntents.ToListAsync());
                Assert.Empty(await before.WorkflowInstances.ToListAsync());
                return;
            }
            var original = await before.WorkflowLaunchIntents.AsNoTracking().SingleAsync();
            Assert.Contains("https://example.invalid/original", original.Request);
            var unqualified = stage == "request" || stage == "prepared" && rollback;
            Assert.Equal(unqualified, original.Prepared is null);
            Assert.Equal(stage == "accepted" && !rollback, original.AcceptedAt is not null);
            recipe.Description = "Unrelated save after failed or acknowledged launch";
            await db.SaveChangesAsync();
            Assert.Equal(stage == "accepted" && !rollback ? 1 : 0, await before.WorkflowInstances.CountAsync());
            await storage.SaveAsync("workflows", "url-import.yaml", "invalid: [");
            if (changedGeneration)
            {
                before.RecoveryPublications.Add(new RecoveryPublication { OperationId = Guid.NewGuid(), SnapshotId = Guid.NewGuid() });
                await before.SaveChangesAsync();
            }
            await using var first = Context();
            await using var second = Context();
            if (unqualified || changedGeneration)
            {
                Assert.Equal(0, await Orchestrator(first).ReconcileLaunchesAsync());
                await Assert.ThrowsAsync<InvalidDataException>(() => Orchestrator(second).TriggerImportAsync(id, recipe.Id, "url-import", parameters));
            }
            else
                await Task.WhenAll(Orchestrator(first).ReconcileLaunchesAsync(), Orchestrator(second).ReconcileLaunchesAsync());

            await using var read = Context();
            var retained = await read.WorkflowLaunchIntents.AsNoTracking().SingleAsync();
            Assert.Equal(original.Request, retained.Request);
            Assert.Equal(original.Prepared, retained.Prepared);
            if (unqualified || changedGeneration)
            {
                Assert.Null(retained.AcceptedAt);
                Assert.Empty(await read.WorkflowInstances.ToListAsync());
                Assert.Null((await read.RecipeImportReports.SingleAsync()).LastWorkflowInstanceId);
            }
            else
            {
                Assert.NotNull(retained.AcceptedAt);
                var accepted = await read.WorkflowInstances.Include(x => x.Tasks).SingleAsync();
                Assert.Equal(id, accepted.Id);
                Assert.Single(accepted.Tasks);
                Assert.Equal(id, (await read.RecipeImportReports.SingleAsync()).LastWorkflowInstanceId);
                Assert.Contains("https://example.invalid/original", accepted.Parameters);
            }
        });
    }

    private sealed class CommitFailure(string stage, bool rollback) : DbTransactionInterceptor
    {
        public bool Fired { get; private set; }
        private bool Matches(DbContext? db)
        {
            var value = db?.ChangeTracker.Entries<WorkflowLaunchIntent>().SingleOrDefault()?.Entity;
            return !Fired && value is not null && stage == (value.AcceptedAt is not null ? "accepted" : value.Prepared is not null ? "prepared" : "request");
        }
        public override ValueTask<InterceptionResult> TransactionCommittingAsync(DbTransaction transaction,
            TransactionEventData eventData, InterceptionResult result, CancellationToken cancellationToken = default)
        {
            if (rollback && Matches(eventData.Context)) { Fired = true; throw new IOException("Synthetic precommit failure"); }
            return ValueTask.FromResult(result);
        }
        public override Task TransactionCommittedAsync(DbTransaction transaction, TransactionEndEventData eventData,
            CancellationToken cancellationToken = default)
        {
            if (!rollback && Matches(eventData.Context)) { Fired = true; throw new IOException("Synthetic lost commit acknowledgement"); }
            return Task.CompletedTask;
        }
    }
}
