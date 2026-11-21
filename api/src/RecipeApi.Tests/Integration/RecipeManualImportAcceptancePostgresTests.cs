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

public sealed class RecipeManualImportAcceptancePostgresTests(ITestOutputHelper output)
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task LaunchCommit_ExposesManualWorkflowAndReportTogether() => CheckAsync("commit");

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task LostCommitAcknowledgement_RereadsManualWorkflowWithoutDeletingChild() => CheckAsync("lost-ack");

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task FailedCommit_RollsBackManualChildAndAttemptButRetainsReport() => CheckAsync("rollback");

    private async Task CheckAsync(string mode)
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            RecipeDbContext ReadContext() => new(new DbContextOptionsBuilder<RecipeDbContext>()
                .UseNpgsql(settings.ConnectionString).Options);
            var observer = new AcceptanceObserver(mode, ReadContext);
            await using var db = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>()
                .UseNpgsql(settings.ConnectionString).AddInterceptors(observer).Options);
            var originalTime = DateTimeOffset.Parse("2026-10-01T00:00:00Z");
            var member = new FamilyMember { Id = Guid.NewGuid(), Name = "Synthetic member" };
            var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Synthetic recipe", SourceUrl = "https://example.invalid/recipe" };
            db.FamilyMembers.Add(member);
            db.Recipes.Add(recipe);
            db.RecipeImportReports.Add(new RecipeImportReport
            {
                RecipeId = recipe.Id, Reasons = ["ingredients"], Note = "Original feedback",
                LastError = "Original failure", ReimportedAt = originalTime
            });
            await db.SaveChangesAsync();
            var storage = new InMemoryStorageProvider();
            await new RecipeRepository(storage).SaveInfoAsync(new RecipeInfo { Id = recipe.Id, SourceUrl = recipe.SourceUrl }, default);
            await storage.SaveAsync("workflows", "url-import.yaml", """
                name: url-import
                parameters: [recipeId, url, repairReasons?, repairNote?]
                tasks:
                  - name: retain
                    processor: FetchUrlContent
                    payload:
                      recipeId: "{{recipeId}}"
                """);
            var clock = new SystemClock();
            var orchestrator = new WorkflowOrchestrator(clock, new WorkflowRepository(storage), db,
                TestPublicationStore.Create(db, storage, clock));
            Guid? accepted = null;
            var service = new RecipeImportService(db, orchestrator);
            if (mode == "rollback")
            {
                await Assert.ThrowsAsync<IOException>(async () => await service.TriggerImport(recipe.Id));
                // A later unrelated save cannot resurrect an unaccepted child or attempt.
                recipe.Description = "Unrelated later save";
                await db.SaveChangesAsync();
            }
            else
                accepted = await service.TriggerImport(recipe.Id);

            await using var readback = ReadContext();
            var report = await readback.RecipeImportReports.AsNoTracking().SingleAsync();
            Assert.True(observer.BeforeCommitObserved);
            Assert.Equal(["ingredients"], report.Reasons);
            Assert.Equal("Original feedback", report.Note);
            if (mode == "rollback")
            {
                Assert.Equal("Original failure", report.LastError);
                Assert.Equal(originalTime, report.ReimportedAt);
                Assert.Null(report.LastWorkflowInstanceId);
                Assert.Null(report.LastAttemptAt);
                Assert.Equal(RecipeImportReportStatus.Reported, report.Status);
                Assert.Empty(await readback.WorkflowInstances.ToListAsync());
                Assert.Empty(await readback.WorkflowTasks.ToListAsync());
                Assert.False(observer.AfterCommitAssociated);
            }
            else
            {
                Assert.True(observer.AfterCommitAssociated);
                Assert.NotNull(accepted);
                Assert.Equal(accepted, report.LastWorkflowInstanceId);
                var workflow = await readback.WorkflowInstances.Include(x => x.Tasks).SingleAsync();
                Assert.Equal(accepted, workflow.Id);
                Assert.NotNull(workflow.RecipePublicationCapture);
                Assert.Single(workflow.Tasks);
                Assert.Equal(RecipeImportReportStatus.Reimporting, report.Status);
                Assert.NotNull(report.LastAttemptAt);
                Assert.Null(report.LastError);
                Assert.Null(report.ReimportedAt);
            }
        });
    }

    private sealed class AcceptanceObserver(string mode, Func<RecipeDbContext> readContext) : DbTransactionInterceptor
    {
        public bool BeforeCommitObserved { get; private set; }
        public bool AfterCommitAssociated { get; private set; }

        private static bool IsLaunch(DbContext? db) => db?.ChangeTracker.Entries<WorkflowInstance>().Any() == true;

        public override async ValueTask<InterceptionResult> TransactionCommittingAsync(DbTransaction transaction,
            TransactionEventData eventData, InterceptionResult result, CancellationToken cancellationToken = default)
        {
            if (!IsLaunch(eventData.Context)) return result;
            await using var read = readContext();
            var report = await read.RecipeImportReports.AsNoTracking().SingleAsync(cancellationToken);
            // Another connection sees only the original report until acceptance commits.
            BeforeCommitObserved = !await read.WorkflowInstances.AnyAsync(cancellationToken)
                && report.LastWorkflowInstanceId is null && report.Status == RecipeImportReportStatus.Reported;
            if (mode == "rollback") throw new IOException("Synthetic precommit failure");
            return result;
        }

        public override async Task TransactionCommittedAsync(DbTransaction transaction, TransactionEndEventData eventData,
            CancellationToken cancellationToken = default)
        {
            if (!IsLaunch(eventData.Context)) return;
            await using var read = readContext();
            var report = await read.RecipeImportReports.AsNoTracking().SingleAsync(cancellationToken);
            var workflow = await read.WorkflowInstances.AsNoTracking().SingleAsync(cancellationToken);
            AfterCommitAssociated = report.LastWorkflowInstanceId == workflow.Id
                && report.Status == RecipeImportReportStatus.Reimporting && report.LastAttemptAt is not null;
            if (mode == "lost-ack") throw new IOException("Synthetic lost commit acknowledgement");
        }
    }
}
